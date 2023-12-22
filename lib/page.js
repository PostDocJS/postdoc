import { cwd } from 'node:process';
import { inspect } from 'node:util';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { sep, resolve, dirname, basename, extname, join } from 'node:path';

import anymatch from 'anymatch';
import { renderAsync } from '@pineview/ejs';

import Logger from './logger.js';
import PostDocError from './error.js';
import Configuration from './configuration.js';
import PageEnvironment from './page-environment.js';

const CLOSING_HEAD_TAG = '</head>';
const navigationManagerScript =
  '<script type="module">import \'postdoc/client\';</script>';

export default class Page {
  static resolveOutputFilePath(
    baseFilePath,
    rootDirectoryPath,
    temporaryOutputDirectoryName
  ) {
    const configuration = Configuration.get();

    const outputRootDirectoryPath = resolve(
      configuration.directories.output,
      '..',
      temporaryOutputDirectoryName
    );

    const basePageName = basename(baseFilePath, extname(baseFilePath));

    return join(
      dirname(baseFilePath.replace(rootDirectoryPath, outputRootDirectoryPath)),
      basePageName + '.html'
    );
  }

  #url;
  #layoutFilePath;
  #outputFilePath;

  constructor(layoutFilePath, outputFilePath, temporaryOutputDirectoryName) {
    this.#layoutFilePath = layoutFilePath;
    this.#outputFilePath = outputFilePath;

    const configuration = Configuration.get();

    const outputRootDirectoryPath = resolve(
      configuration.directories.output,
      '..',
      temporaryOutputDirectoryName
    );

    this.#url = this.#outputFilePath
      .replace(outputRootDirectoryPath, '')
      .replaceAll(sep, '/');

    if (anymatch(configuration.ignore.layouts, this.#layoutFilePath)) {
      throw new PostDocError('page:ignored-layout', {
        pageUrl: this.#url,
        layoutPagePath: this.#layoutFilePath
      });
    }
  }

  get url() {
    return this.#url;
  }

  get outputFilePath() {
    return this.#outputFilePath;
  }

  get layoutFilePath() {
    return this.#layoutFilePath;
  }

  async compileLayout(pages, additionalPageInformation) {
    const layoutContent = await readFile(this.#layoutFilePath, 'utf8');

    const configuration = Configuration.get();

    const environment = new PageEnvironment(
      this.#layoutFilePath,
      this.#url,
      this.#outputFilePath,
      pages,
      additionalPageInformation
    );

    try {
      const compiledPage = await renderAsync(layoutContent, environment, {
        root: cwd(),
        async: true,
        views: [resolve(configuration.directories.includes)],
        filename: this.#layoutFilePath
      });

      return compiledPage.replace(
        CLOSING_HEAD_TAG,
        `${navigationManagerScript}\n${CLOSING_HEAD_TAG}`
      );
    } catch (error) {
      Logger.log((typography) => {
        const layoutFilePathFromPackageRoot = this.#layoutFilePath.replace(
          cwd(),
          '~'
        );

        return `
          An error occurred while rendering ${typography.bold(
    layoutFilePathFromPackageRoot
  )} template:

          ${inspect(error, { colors: true, compact: false })}          
        `;
      }, Logger.ErrorLevel);
    }
  }

  async compileAndWrite(pages) {
    const compiledPage = await this.compile(pages);

    if (!compiledPage) {
      // All relative errors have been displayed. Just abort writing.
      return;
    }

    await mkdir(dirname(this.#outputFilePath), { recursive: true });

    await writeFile(this.#outputFilePath, compiledPage, 'utf8');
  }

  // Override this method if a page has to perform some checks
  // after creation to be sure that it is legit.
  async shouldCompile() {
    return true;
  }
}
