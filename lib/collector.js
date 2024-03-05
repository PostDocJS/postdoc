import { rm } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { basename, resolve } from 'node:path';

import anymatch from 'anymatch';
import AsyncIterable from '@halo-lab/iterable/async';
import { pipeWith } from 'pipe-ts';

import Logger from './logger.js';
import ApiPage from './api-page.js';
import LayoutPage from './layout-page.js';
import MarkdownPage from './markdown-page.js';
import RSTPage from './rst-page.js';
import PostDocError from './error.js';
import Configuration from './configuration.js';
import MarkdownCompiler from './markdown-compiler.js';
import RSTCompiler from './rst-compiler.js';
import { walkDirectory } from './fs.js';

export default class Collector {
  #pages = [];
  #configuration = Configuration.get();
  #markdownCompiler = new MarkdownCompiler();
  #rstCompiler = new RSTCompiler();
  #temporaryDirectoryPrefix = '.pd-tmp-';
  #temporaryOutputDirectoryPath;
  #isTemporaryOutputDirectoryPathVirtual;

  constructor(isVirtualTemporaryOutputDirectory) {
    this.#isTemporaryOutputDirectoryPathVirtual = isVirtualTemporaryOutputDirectory;

    const temporaryOutputDirectoryPathPrefix = resolve(this.#configuration.directories.output, '..', this.#temporaryDirectoryPrefix);

    this.#temporaryOutputDirectoryPath = isVirtualTemporaryOutputDirectory ? temporaryOutputDirectoryPathPrefix : mkdtempSync(temporaryOutputDirectoryPathPrefix);
  }

  get pages() {
    return this.#pages;
  }

  get temporaryDirectoryPrefix() {
    return this.#temporaryDirectoryPrefix;
  }

  get temporaryOutputDirectoryPath() {
    return this.#temporaryOutputDirectoryPath;
  }

  #tryCreatingPage(filePath, Constructor, ...additionalConstructorParameters) {
    try {
      return new Constructor(filePath, basename(this.#temporaryOutputDirectoryPath), ...additionalConstructorParameters);
    } catch (error) {
      if (error instanceof PostDocError) {
        Logger.log(() => error.message, Logger.ErrorLevel);
      } else {
        Logger.log((typography) => `
            An unknown error happened while creating the page:
              ${typography.dim(error.message)}
              ${typography.bold(error.stack)}
          `, Logger.ErrorLevel);
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
      AsyncIterable.filter((filePath) => filePath.endsWith('.js')),
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) => this.#tryCreatingPage(filePath, ApiPage)),
      AsyncIterable.filter(Boolean),
      AsyncIterable.chain((page) => AsyncIterable.from(async function* () {
        // We should be sure that the page has at least one comment.
        if (await page.shouldCompile()) {
          yield page;
        }
      }))
    );
  }

  #collectMDPages() {
    const shouldIgnore = anymatch(this.#configuration.ignore.pages);

    const pages = this.#configuration.directories.content;
    const markdownCompiler = this.#markdownCompiler;

    return pipeWith(AsyncIterable.from(async function* () {
        await markdownCompiler.initialise();

        yield* pipeWith(pages, resolve, walkDirectory, ({ files }) => files);
      }),
      AsyncIterable.filter((filePath) => filePath.endsWith('.md')),
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) => this.#tryCreatingPage(filePath, MarkdownPage, markdownCompiler)),
      AsyncIterable.filter(Boolean),
      AsyncIterable.chain((page) => AsyncIterable.from(async function* () {
        if (await page.shouldCompile()) {
          yield page;
        }
      }))
    );
  }

  #collectRSTPages() {
    const shouldIgnore = anymatch(this.#configuration.ignore.pages);

    const pages = this.#configuration.directories.content;
    const rstCompiler = this.#rstCompiler;

    return pipeWith(AsyncIterable.from(async function* () {
        await rstCompiler.initialise();

        yield* pipeWith(pages, resolve, walkDirectory, ({ files }) => files);
      }),
      AsyncIterable.filter((filePath) => filePath.endsWith('.rst')),
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) => this.#tryCreatingPage(filePath, RSTPage, rstCompiler)),
      AsyncIterable.filter(Boolean),
      AsyncIterable.chain((page) => AsyncIterable.from(async function* () {
        if (await page.shouldCompile()) {
          yield page;
        }
      }))
    );
  }

  #collectLayoutPages() {
    const shouldIgnore = anymatch(this.#configuration.ignore.layouts);
    const apidocsLayout = resolve(this.#configuration.directories.layouts, this.#configuration.apidocs.layout);

    return pipeWith(this.#configuration.directories.layouts, resolve, walkDirectory,
      ({ files }) => files,
      AsyncIterable.filter((file) => file !== apidocsLayout),
      AsyncIterable.filter((filePath) => filePath.endsWith('.ejs')),
      AsyncIterable.filter((filePath) => !shouldIgnore(filePath)),
      AsyncIterable.map((filePath) => this.#tryCreatingPage(filePath, LayoutPage)),
      AsyncIterable.filter(Boolean),
      AsyncIterable.chain((page) => AsyncIterable.from(async function* () {
        if (await page.shouldCompile()) {
          yield page;
        }
    })));
  }

  async collectPages() {
    const layoutsUsedInPages = new Set();

    const pages = await pipeWith(
      this.#collectMDPages(),
      AsyncIterable.concat(this.#collectRSTPages()),
      AsyncIterable.concat(this.#collectApiDocs()),
      AsyncIterable.fold([], (pages, page) => {
        pages.push(page);

        layoutsUsedInPages.add(page.layoutFilePath);

        return pages;
      })
    );

    await pipeWith(
      this.#collectLayoutPages(),
      AsyncIterable.filter((page) => {
        const pageExists = pages.find(p => p.url === page.url);

        return !layoutsUsedInPages.has(page.layoutFilePath) || !pageExists;
      }),
      AsyncIterable.forEach((page) => {
        pages.push(page);
      })
    );

    this.#pages = pages;
  }

  async writePages() {
    await Promise.all(this.#pages.map((page) => page.compileAndWrite(this.#pages)));
  }

  async clear() {
    if (!this.#isTemporaryOutputDirectoryPathVirtual) {
      await rm(this.#temporaryOutputDirectoryPath, { recursive: true });
    }
  }
}
