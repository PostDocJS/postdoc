import { cwd } from 'node:process';
import { inspect } from 'node:util';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { sep, resolve, dirname, basename, extname, join } from 'node:path';

import anymatch from 'anymatch';
import { renderAsync } from '@pineview/ejs';

import Logger from './logger.js';
import PostDocError from './error.js';
import Configuration from './configuration.js';
import PageEnvironment from './page-environment.js';

const CLOSING_HEAD_TAG = '</head>';
const navigationManagerScript = (configuration) => {
  return '<script type="module">import {session} from \'postdoc/client\';\n' +
    'globalThis.PostDoc.configuration = JSON.parse(\'' + JSON.stringify(configuration) + '\');session.init();</script>';
}


const toValidVarName = (file) => {
  const type = extname(file);
  const fileName = basename(file, type);
  let name = fileName.replace(/[^a-zA-Z0-9_$]/g, '_');

  // Convert kebab-case and snake_case to camelCase
  name = name.replace(/[_-]+([a-z])/g, (g, char) => char.toUpperCase());

  // Ensure the name doesn't start with a number
  if (/^[0-9]/.test(name)) {
    name = '_' + name;
  }

  // Check if the name is a reserved word and prefix with underscore if it is
  const reservedWords = [
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in',
    'instanceof', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof',
    'var', 'void', 'while', 'with', 'yield'
  ];

  if (reservedWords.includes(name)) {
    name = '_' + name;
  }

  return [name, fileName, type.toLowerCase().substring(1)];
};

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

    if (!this.#layoutFilePath) {
      throw new PostDocError('page:missed-layout', {
        pageUrl: this.#url
      });
    }

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


  async getIncludeFiles(configuration) {
    const includesDir = resolve(configuration.directories.includes);

    try {
      const files = await readdir(includesDir);

      return files
        .filter(file => ['.ejs', '.jsx', '.tsx'].includes(extname(file)))
        .map(toValidVarName);
    } catch (error) {
      Logger.error(`Error reading includes directory: ${includesDir}`);

      throw error;
    }
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
      const files = await this.getIncludeFiles(configuration);
      const compiledPage = await renderAsync(layoutContent, environment, {
        root: cwd(),
        async: true,
        views: [resolve(configuration.directories.includes)],
        filename: this.#layoutFilePath,
        files
      });

      return compiledPage.replace(
        CLOSING_HEAD_TAG,
        `${navigationManagerScript({
          disable_spa: configuration.session?.disable_spa || false,
          enable_prefetch: configuration.session?.enable_prefetch || false
        })}\n${CLOSING_HEAD_TAG}`
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
