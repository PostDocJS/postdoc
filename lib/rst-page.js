import { inspect } from 'node:util';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';

import Page from './page.js';
import Logger from './logger.js';
import Configuration from './configuration.js';

export default class RSTPage extends Page {
  static #findLayout(directoryPath, contentPageName, configuration) {
    const absoluteLayoutsPath = resolve(configuration.directories.layouts);

    if (!directoryPath.includes(absoluteLayoutsPath)) {
      return;
    }

    const namedLayoutPath = join(directoryPath, contentPageName + '.ejs');
    const sharedLayoutPath = join(directoryPath, 'index.ejs');

    if (existsSync(namedLayoutPath)) {
      return namedLayoutPath;
    }

    if (existsSync(sharedLayoutPath)) {
      return sharedLayoutPath;
    }

    if (directoryPath !== absoluteLayoutsPath) {
      return this.#findLayout(join(directoryPath, '..'), contentPageName, configuration);
    }
  }

  #contentFilePath;
  #rstCompiler;

  constructor(contentFilePath, temporaryOutputDirectoryName, rstCompiler) {
    const configuration = Configuration.get();

    const contentPageName = basename(contentFilePath, extname(contentFilePath));
    const rootPagesDirectoryPath = resolve(configuration.directories.content);

    const outputFilePath = Page.resolveOutputFilePath(contentFilePath, rootPagesDirectoryPath, temporaryOutputDirectoryName);
    const layoutFilePath = RSTPage.#findLayout(dirname(contentFilePath.replace(rootPagesDirectoryPath, resolve(configuration.directories.layouts))), contentPageName, configuration);

    super(layoutFilePath, outputFilePath, temporaryOutputDirectoryName);

    this.#contentFilePath = contentFilePath;
    this.#rstCompiler = rstCompiler;
  }

  async #compileContent(allowDrafts) {
    const content = await readFile(this.#contentFilePath, 'utf8');

    try {
      const result = await this.#rstCompiler.compile(content);

      if (result[0].draft && !allowDrafts) {
        return;
      }

      return result;
    } catch (error) {
      Logger.log((typography) => `
            Cannot compile the ${typography.bold(this.#contentFilePath)} because of the following error:

              ${inspect(error, { compact: false, colors: true })}
          `, Logger.ErrorLevel);
    }
  }

  async compile(pages, allowDrafts) {
    const compiledContentAndFrontMatter = await this.#compileContent(allowDrafts);

    if (!compiledContentAndFrontMatter) {
      // All relative errors have been displayed. Just abort writing.
      return;
    }

    const [frontMatter, content] = compiledContentAndFrontMatter;

    return this.compileLayout(pages, {
      ...frontMatter, content
    });
  }
}
