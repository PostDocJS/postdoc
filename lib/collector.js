import { rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { basename, resolve } from "node:path";

import anymatch from "anymatch";
import AsyncIterable from "@halo-lab/iterable/async";
import { pipeWith } from "pipe-ts";

import Logger from "./logger.js";
import ApiPage from "./api-page.js";
import LayoutPage from "./layout-page.js";
import RegularPage from "./regular-page.js";
import PostDocError from "./error.js";
import Configuration from "./configuration.js";
import MarkdownCompiler from "./markdown-compiler.js";
import { walkDirectory } from "./fs.js";

export default class Collector {
  #pages = [];
  #configuration = Configuration.get();
  #markdownCompiler = new MarkdownCompiler();
  #temporaryOutputDirectoryPath;
  #isTemporaryOutputDirectoryPathVirtual;

  constructor(isVirtualTemporaryOutputDirectory) {
    this.#isTemporaryOutputDirectoryPathVirtual =
      isVirtualTemporaryOutputDirectory;

    const temporaryOutputDirectoryPathPrefix = resolve(
      this.#configuration.directories.output,
      "..",
      ".pd-tmp-",
    );

    this.#temporaryOutputDirectoryPath = isVirtualTemporaryOutputDirectory
      ? temporaryOutputDirectoryPathPrefix
      : mkdtempSync(temporaryOutputDirectoryPathPrefix);
  }

  get pages() {
    return this.#pages;
  }

  get temporaryOutputDirectoryPath() {
    return this.#temporaryOutputDirectoryPath;
  }

  #tryCreatingPage(filePath, Constructor, ...additionalConstructorParameters) {
    try {
      return new Constructor(
        filePath,
        basename(this.#temporaryOutputDirectoryPath),
        ...additionalConstructorParameters,
      );
    } catch (error) {
      if (error instanceof PostDocError) {
        Logger.log(
          (typography) => `
    					The following API file does not have a corresponding layout: ${typography.dim(
                filePath,
              )}.
    						Please add at least a default one ${typography.bold(
                  resolve(
                    this.#configuration.directories.layouts,
                    this.#configuration.apidocs.layout,
                  ),
                )} or check if it is accidentally ignored.
    				`,
          Logger.ErrorLevel,
        );
      } else {
        Logger.log(
          (typography) => `
            An unknown error happened while creating a page:
              ${typography.bold(error.stack)}
          `,
          Logger.ErrorLevel,
        );
      }
    }
  }

  #collectApiDocs() {
    if (!this.#configuration.apidocs.source) {
      return AsyncIterable.of();
    }

    const shouldIgnore = anymatch(this.#configuration.ignore.apidocs);

    return pipeWith(
      this.#configuration.apidocs.source,
      resolve,
      walkDirectory,
      ({ files }) => files,
      AsyncIterable.filter((filePath) => filePath.endsWith(".js")),
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) => this.#tryCreatingPage(filePath, ApiPage)),
      AsyncIterable.filter(Boolean),
    );
  }

  #collectRegularPages() {
    const shouldIgnore = anymatch(this.#configuration.ignore.pages);

    const pages = this.#configuration.directories.pages;
    const markdownCompiler = this.#markdownCompiler;

    return pipeWith(
      AsyncIterable.from(async function* () {
        await markdownCompiler.initialise();

        yield* pipeWith(pages, resolve, walkDirectory, ({ files }) => files);
      }),

      AsyncIterable.filter((filePath) => filePath.endsWith(".md")),
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) =>
        this.#tryCreatingPage(filePath, RegularPage, markdownCompiler),
      ),
      AsyncIterable.filter(Boolean),
    );
  }

  #collectLayoutPages() {
    const shouldIgnore = anymatch(this.#configuration.ignore.layouts);

    return pipeWith(
      this.#configuration.directories.layouts,
      resolve,
      walkDirectory,
      ({ files }) => files,
      AsyncIterable.filter((filePath) => filePath.endsWith(".ejs")),
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) =>
        this.#tryCreatingPage(filePath, LayoutPage),
      ),
      AsyncIterable.filter(Boolean),
    );
  }

  async collectPages() {
    const layoutsUsedInPages = new Set();

    const pages = await pipeWith(
      this.#collectRegularPages(),
      AsyncIterable.concat(this.#collectApiDocs()),
      AsyncIterable.fold([], (pages, page) => {
        pages.push(page);

        layoutsUsedInPages.add(page.layoutFilePath);

        return pages;
      }),
    );

    await pipeWith(
      this.#collectLayoutPages(),
      AsyncIterable.filter(
        (page) => !layoutsUsedInPages.has(page.layoutFilePath),
      ),
      AsyncIterable.forEach((page) => pages.push(page)),
    );

    this.#pages = pages;
  }

  async writePages() {
    await Promise.all(
      this.#pages.map((page) => page.compileAndWrite(this.#pages)),
    );
  }

  async clear() {
    if (!this.#isTemporaryOutputDirectoryPathVirtual) {
      await rm(this.#temporaryOutputDirectoryPath, { recursive: true });
    }
  }
}
