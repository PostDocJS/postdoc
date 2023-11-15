import { rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { basename, resolve } from "node:path";

import anymatch from "anymatch";
import AsyncIterable from "@halo-lab/iterable/async";
import { pipeWith } from "pipe-ts";

import Page from "./page.js";
import Logger from "./logger.js";
import ApiPage from "./api-page.js";
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

  #collectApiDocs() {
    if (!this.#configuration.apidocs.source) {
      return AsyncIterable.of();
    }

    const directoryDescriptor = walkDirectory(
      resolve(this.#configuration.apidocs.source),
    );

    const shouldIgnore = anymatch(this.#configuration.ignore.apidocs);
    const shouldInclude = anymatch(this.#configuration.apidocs.filters);

    return pipeWith(
      directoryDescriptor.files,
      AsyncIterable.filter(
        (filePath) => !shouldIgnore(filePath) && shouldInclude(filePath),
      ),
      AsyncIterable.map(
        (filePath) =>
          new ApiPage(filePath, basename(this.#temporaryOutputDirectoryPath)),
      ),
    );
  }

  async collectPages() {
    const shouldIgnore = anymatch(this.#configuration.ignore.pages);

    const directoryDescriptor = walkDirectory(
      resolve(this.#configuration.directories.pages),
    );

    await this.#markdownCompiler.initialise();

    this.#pages = await pipeWith(
      directoryDescriptor.files,
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) => {
        try {
          return new Page(
            filePath,
            basename(this.#temporaryOutputDirectoryPath),
            this.#markdownCompiler,
          );
        } catch (error) {
          Logger.log(
            (typography) => `
    					The following content file does not have a corresponding layout: ${typography.dim(
                filePath,
              )}.
    						Please add at least a default one ${typography.bold(
                  resolve(this.#configuration.directories.layouts, "index.ejs"),
                )}.
    				`,
            Logger.ErrorLevel,
          );
        }
      }),
      AsyncIterable.filter(Boolean),
      AsyncIterable.concat(this.#collectApiDocs()),
      AsyncIterable.fold([], (pages, page) => {
        pages.push(page);

        return pages;
      }),
    );
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
