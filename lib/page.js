import { cwd } from "node:process";
import { inspect } from "node:util";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  sep,
  join,
  resolve,
  dirname,
  extname,
  basename,
  relative,
} from "node:path";

import { renderAsync } from "@pineview/ejs";

import Logger from "./logger.js";
import Configuration from "./configuration.js";

const CLOSING_HEAD_TAG = "</head>";
const navigationManagerScript =
  "<script type=\"module\">import 'postdoc/client';</script>";

class PageEnvironment {
  constructor(
    layoutFilePath,
    pageUrl,
    pageContent,
    outputPagePath,
    frontMatter,
    pages,
  ) {
    this.__filename = layoutFilePath;
    this.__dirname = dirname(layoutFilePath);

    this.require = createRequire(pathToFileURL(layoutFilePath));

    this._import = (path) =>
      import(
        path.startsWith(".")
          ? pathToFileURL(resolve(dirname(layoutFilePath), path))
          : path
      );

    this.url = (path) => {
      const absolutePath = path.startsWith(".")
        ? resolve(dirname(layoutFilePath), path)
        : path.startsWith("~")
        ? path.replace("~", cwd())
        : path;

      return relative(dirname(outputPagePath), absolutePath)
        .split(sep)
        .join("/");
    };

    this.page = {
      ...frontMatter,
      url: pageUrl,
      content: pageContent,
    };

    this.pages = pages.map((page) => page.url);

    this.appSettings = Configuration.get().appSettings;
  }
}

export default class Page {
  #url;
  #outputFilePath;
  #layoutFilePath;
  #contentFilePath;
  #markdownCompiler;

  constructor(contentFilePath, temporaryOutputDirectoryName, markdownCompiler) {
    this.#contentFilePath = contentFilePath;
    this.#markdownCompiler = markdownCompiler;

    const configuration = Configuration.get();

    const rootPagesDirectoryPath = resolve(configuration.directories.pages);

    const contentPageName = basename(contentFilePath, extname(contentFilePath));

    this.#layoutFilePath = this.#findLayout(
      dirname(
        contentFilePath.replace(
          rootPagesDirectoryPath,
          resolve(configuration.directories.layouts),
        ),
      ),
      contentPageName,
      configuration,
    );

    if (!this.#layoutFilePath) {
      throw new Error(`Layout file for the "${contentFilePath}" is not found.`);
    }

    const outputRootDirectoryPath = resolve(
      configuration.directories.output,
      "..",
      temporaryOutputDirectoryName,
    );

    this.#outputFilePath = join(
      dirname(
        contentFilePath.replace(
          rootPagesDirectoryPath,
          outputRootDirectoryPath,
        ),
      ),
      contentPageName + ".html",
    );

    this.#url = this.#outputFilePath.replace(outputRootDirectoryPath, "");
  }

  get url() {
    return this.#url;
  }

  get outputPath() {
    return this.#outputFilePath;
  }

  #findLayout(directoryPath, contentPageName, configuration) {
    const namedLayoutPath = join(directoryPath, contentPageName + ".ejs");
    const sharedLayoutPath = join(directoryPath, "index.ejs");

    if (existsSync(namedLayoutPath)) {
      return namedLayoutPath;
    } else if (existsSync(sharedLayoutPath)) {
      return sharedLayoutPath;
    } else {
      if (!directoryPath.endsWith(configuration.directories.layouts)) {
        return this.#findLayout(
          join(directoryPath, ".."),
          contentPageName,
          configuration,
        );
      }
    }
  }

  async #compileContent(allowDrafts) {
    const content = await readFile(this.#contentFilePath, "utf8");

    try {
      const result = await this.#markdownCompiler.compile(content);

      if (result[0].draft && !allowDrafts) {
        return;
      }

      return result;
    } catch (error) {
      Logger.log(
        (typography) =>
          `
            Cannot compile the ${typography.bold(
              this.#contentFilePath,
            )} because of the following error:

              ${inspect(error, { compact: false, colors: true })}
          `,
        Logger.ErrorLevel,
      );

      return;
    }
  }

  async #compileLayout(frontMatter, content, pages) {
    const layoutContent = await readFile(this.#layoutFilePath, "utf8");

    const pageEnvironment = new PageEnvironment(
      this.#layoutFilePath,
      this.#url,
      content,
      this.#outputFilePath,
      frontMatter,
      pages,
    );

    const configuration = Configuration.get();

    try {
      const compiledPage = await renderAsync(layoutContent, pageEnvironment, {
        root: cwd(),
        async: true,
        views: [resolve(configuration.directories.includes)],
        filename: this.#layoutFilePath,
      });

      return compiledPage.replace(
        CLOSING_HEAD_TAG,
        `${navigationManagerScript}\n${CLOSING_HEAD_TAG}`,
      );
    } catch (error) {
      Logger.log((typography) => {
        const layoutFilePathFromPackageRoot = this.#layoutFilePath.replace(
          cwd(),
          "~",
        );

        return `
          An error occurred while rendering ${typography.bold(
            layoutFilePathFromPackageRoot,
          )} template:

          ${inspect(error, { colors: true, compact: false })}          
        `;
      }, Logger.ErrorLevel);

      return;
    }
  }

  async compile(pages, allowDrafts) {
    const compiledContentAndFrontMatter =
      await this.#compileContent(allowDrafts);

    if (!compiledContentAndFrontMatter) {
      // All relative errors has been displayed. Just abort writing.
      return;
    }

    const [frontMatter, content] = compiledContentAndFrontMatter;

    return this.#compileLayout(frontMatter, content, pages);
  }

  async compileAndWrite(pages) {
    const compiledPage = await this.compile(pages);

    if (!compiledPage) {
      // All relative errors has been displayed. Just abort writing.
      return;
    }

    await mkdir(dirname(this.#outputFilePath), { recursive: true });

    await writeFile(this.#outputFilePath, compiledPage, "utf8");
  }
}
