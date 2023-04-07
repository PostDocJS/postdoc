/**
 * @file Contains the bundler's main functions.
 *   Bundler consists of the own EJS and MD compiler
 *   and the Vite as the post-process tool for compiled
 *   pages and assets like images, scripts, styles and other
 *   static files.
 *
 * @module bundler
 */

import {cwd} from 'node:process';
import {mkdtempSync} from 'node:fs';
import {dirname, join} from 'node:path';

import {tap} from '../utils/fp.js';
import {Stream} from '../utils/stream.js';
import {Symbols} from '../logger/symbols.js';
import {Container} from '../utils/container.js';
import {Typography} from '../logger/colors.js';
import {Directory, File} from '../files.js';
import {CONFIGURATION_ID} from '../configuration/index.js';
import {createPageCompiler} from './page/index.js';
import {build, startServer} from './vite/index.js';
import {MD_SUFFIX, EJS_SUFFIX} from '../constants.js';
import {pageEventsChannel, PageEventType} from './vite/plugin.js';
import {MessageBuilder, info, LineBuilder, Separator} from '../logger/index.js';
import {
  isPageFile,
  getAllPages,
  allPagesCacheDescriptor
} from './page/entity.js';
import {
  removeCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts
} from './cache.js';

/** Builds a project. */
export const buildProject = async () => {  
  const configuration = Container.get(CONFIGURATION_ID);

  const temporaryDirectory = mkdtempSync(
    join(dirname(configuration.directories.output), '.pd-tmp-')
  );

  const allPages = getAllPages(configuration);

  const compile = createPageCompiler(allPages);

  await Promise.all(allPages.map(async (page) => {
    const content = await compile(page);

    return content !== null
      ? File(
        page.output
          .source()
          .replace(configuration.directories.output, temporaryDirectory)
      )
        .map(() => content)
        .write()
      : null;
  }));

  await build(configuration, temporaryDirectory);

  await Directory(temporaryDirectory).remove();
};

/**
 * @enum {string}
 * @readonly
 */
const FSEventType = {
  Add: 'fsevent-add',
  Change: 'fsevent-change',
  Remove: 'fsevent-remove'
};

/**
 * @typedef {Object} FSEvent
 * @property {string} file
 * @property {FSEventType} type
 */

/**
 * Looking at the dependency graph rebuilds either matched entities
 * or the whole project.
 *
 * @param {FSEvent} event 
 */
const rebuild = async ({type, file}) => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pages = getAllPages(configuration);

  const compile = createPageCompiler(pages);

  let invalidatedPages = pages;

  if (isPageFile(file) && (type === FSEventType.Add || type === FSEventType.Remove)) {
    MessageBuilder()
      .line(Separator.Empty)
      .line(
        LineBuilder()
          .text(Symbols.Diamond)
          .phrase('The')
          .phrase(
            Typography().bold(file.source().replace(cwd(), ''))
          )
          .phrase(`file was ${type === FSEventType.Add ? 'added' : 'deleted'}. Rebuilding all pages...`)
          .build()
      )
      .pipe(info);

    getCacheKeyDescriptorsByParts(file.source())
      .forEach(removeCacheEntry);

    pageEventsChannel.send({
      type: FSEventType.Add ? PageEventType.Add : PageEventType.Remove
    });
  } else {
    invalidatedPages = pages
      .filter(
        (page) =>
          page.layout.source() === file.source()
          || page.content.source() === file.source()
          || getCacheKeyDescriptorsByParts([page.output.source(), file.source()]).length > 0
      );

    invalidatedPages.reduce(
      (builder, page) => builder.line(
        LineBuilder()
          .text('Rebuilding the')
          .phrase(Typography().bold.yellow(page.url))
          .phrase('page...')
          .padStart(2, Separator.Space)
          .build()
      ),
      MessageBuilder()
        .line(Separator.Empty)
        .line(
          LineBuilder()
            .text(Symbols.Diamond)
            .phrase('The')
            .phrase(Typography().bold(file.source().replace(cwd(), '')))
            .phrase(
              `file has been ${type === FSEventType.Add ? 'added' : type === FSEventType.Change ? 'changed' : 'removed'}.`
            )
            .build()
        )
    ).pipe(info);

    if (FSEventType.Change === type || FSEventType.Remove === type) {
      getCacheKeyDescriptorsByParts(file.source())
        .filter(descriptorShouldBeFor(file.source()))
        .forEach(removeCacheEntry);
    }
  }

  await Promise.all(invalidatedPages.map(async (page) => {
    // The same descriptor is used as in the vite plugin.
    removeCacheEntry([page.url, page.output.source()]);

    // We store compiled page in the cache, from which the dev server
    // can pick it up.
    await compile(page);

    // Notify a client that it should reload the page.
    pageEventsChannel.send({
      // Event if some file is deleted it is not the layout file,
      // so a page itself is changed.
      type: PageEventType.Change,
      payload: {url: page.url}
    });
  }));

  MessageBuilder()
    .line(
      LineBuilder()
        .text(Typography().green(Symbols.Check))
        .phrase('Done.')
        .build()
    ).pipe(info);
};

/**
 * Builds a project and continues watching for changes.
 * The built pages are available through the `localhost` and
 * local network.
 */
export const serveProject = async () => {  
  /** @type {import('../configuration/defaults.js').Configuration} */
  const configuration = Container.get(CONFIGURATION_ID);

  const changes = Stream(
    ({type, file}) => file.endsWith(EJS_SUFFIX) || file.endsWith(MD_SUFFIX)
      ? {type, file: File(file)}
      : undefined,
    tap(({type}) => {
      if (type === FSEventType.Add || type === FSEventType.Remove) {
        removeCacheEntry(allPagesCacheDescriptor);
      }
    })
  );

  changes.forEach(rebuild);

  // Watches for the layouts change.
  Directory(configuration.directories.pages)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send({type: FSEventType.Add, file}))
    .on('change', (file) => changes.send({type: FSEventType.Change, file}))
    .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));

  // Watches for the includes change.
  Directory(configuration.directories.includes)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send({type: FSEventType.Add, file}))
    .on('change', (file) => changes.send({type: FSEventType.Change, file}))
    .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));

  if (configuration.directories.pages !== configuration.directories.layouts) {
    // Watches for the layouts change.
    Directory(configuration.directories.layouts)
      .recursive(true)
      .watch()
      .on('add', (file) => changes.send({type: FSEventType.Add, file}))
      .on('change', (file) => changes.send({type: FSEventType.Change, file}))
      .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));
  }

  // Sets up the development server.
  await startServer(configuration);
};
