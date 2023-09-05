/**
 * @file Contains the bundler's main functions.
 *   Bundler consists of the own EJS and MD compiler
 *   and the Vite as the post-process tool for compiled
 *   pages and assets like images, scripts, styles and other
 *   static files.
 *
 * @module bundler
 */

import {cwd, env} from 'node:process';
import {mkdtempSync} from 'node:fs';
import {dirname, join} from 'node:path';

import Stream from '@halo-lab/stream';
import {apps} from 'open';

import {pipeWith} from '../utils/fp.js';
import {Symbols} from '../logger/symbols.js';
import {Container} from '../utils/container.js';
import {Typography} from '../logger/colors.js';
import {Directory, File} from '../files.js';
import {CONFIGURATION_ID} from '../configuration/index.js';
import {createPageCompiler} from './page/index.js';
import {MD_EXTENSION, EJS_EXTENSION} from '../constants.js';
import {createBroadcastingStream} from '../utils/stream.js';
import {pushToClient, PageEventType} from './vite/plugin.js';
import {build, startServer, startPreviewServer} from './vite/index.js';
import {MessageBuilder, info, LineBuilder, Separator} from '../logger/index.js';
import {
  isPage,
  getAllPages,
  isPartial,
  allPagesCacheDescriptor
} from './page/entity.js';
import {
  clearCache,
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

  try {
    await build(configuration, temporaryDirectory);
  } catch (err) {
    console.error(`Errors during build: ${err}`);
  } finally {
    await Directory(temporaryDirectory).remove();
  }
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
 * @param {import('../files.js').IFile} file
 * @param {import('../configuration/defaults.js').Configuration} configuration
 */
const isApiFile = (file, configuration) => typeof configuration.directories.api === 'string'
  ? file.source().startsWith(configuration.directories.api)
  : configuration.directories.api.some((path) => file.source().startsWith(path));

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
  /** @type {import('../configuration/defaults.js').Configuration} */
  const configuration = Container.get(CONFIGURATION_ID);

  const pages = getAllPages(configuration);

  const compile = createPageCompiler(pages);

  let invalidatedPages = pages;

  if (isPage(file) && (type === FSEventType.Add || type === FSEventType.Remove)) {
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

    pushToClient({
      type: type === FSEventType.Add ? PageEventType.Add : PageEventType.Remove
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
    pushToClient({
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
 * @typedef {Object} ServeProjectOptions
 * @property {string} [startUrl]
 * @property {boolean | string} autoOpenBrowser
 * @property {boolean | string} [allowRequestsFromPublicAddresses]
 */

/**
 * Determines whether a browser should be opened automatially
 * and if there is a browser's name, it is populated to the
 * `open` packages through Env.
 *
 * @param {boolean | string} autoOpenBrowser
 * @param {string} [url]
 * @returns {boolean | string}
 */
const determineBrowserAutoOpening = (autoOpenBrowser, url) => {
  let shouldOpenBrowser = Boolean(url);

  if (typeof autoOpenBrowser === 'boolean') {
    env.BROWSER = apps.browser;

    shouldOpenBrowser = autoOpenBrowser;
  } else {
    switch (autoOpenBrowser) {
      case 'chrome':
        env.BROWSER = apps.chrome;
        break;
      case 'firefox':
        env.BROWSER = apps.firefox;
        break;
      case 'edge':
        env.BROWSER = apps.edge;
        break;
      default:
        env.BROWSER = autoOpenBrowser;
    }

    shouldOpenBrowser = true;
  }

  // If URL is explicitly provided, return it because user explicitly wants
  // to rewrite the value which is declared in the config file. 
  return url || shouldOpenBrowser;
};

/**
 * @param {FSEventType} type
 * @param {Stream.Sink<string>}
 * @returns {(value: string) => void}
 */
const createChangeProvider = (type, push) => (file) => push({type, file});

/**
 * Builds a project and continues watching for changes.
 * The built pages are available through the `localhost` and
 * local network.
 *
 * @param {ServeProjectOptions} options
 */
export const serveProject = async (options) => {  
  /** @type {import('../configuration/defaults.js').Configuration} */
  const configuration = Container.get(CONFIGURATION_ID);

  const [changes, pushChange] = createBroadcastingStream();

  pipeWith(
    changes,
    Stream.map(({type, file}) => ({type, file: File(file)})),
    Stream.map((change) => {
      if (configuration.directories.api && isApiFile(change.file, configuration)) {
        clearCache();
       
        // Just sending an event. The url doesn't matter because any page
        // should be reloaded on API change.
        pushToClient({
          type: PageEventType.Change,
          payload: {}
        });

        return;
      }

      return change;
    }),
    Stream.filter(Boolean),
    Stream.filter(({file}) => file.extension() === MD_EXTENSION || file.extension() === EJS_EXTENSION),
    Stream.filter((change) => !isPartial(change.file)),
    Stream.map((change) => {
      if (change.type === FSEventType.Add || change.type === FSEventType.Remove) {
        removeCacheEntry(allPagesCacheDescriptor);
      }

      return change;
    }),
    Stream.forEach(rebuild)
  );

  // Watches for the layouts change.
  Directory(configuration.directories.pages)
    .recursive(true)
    .watch()
    .on('add', createChangeProvider(FSEventType.Add, pushChange))
    .on('change', createChangeProvider(FSEventType.Change, pushChange))
    .on('unlink', createChangeProvider(FSEventType.Remove, pushChange));

  // Watches for the includes change.
  Directory(configuration.directories.includes)
    .recursive(true)
    .watch()
    .on('add', createChangeProvider(FSEventType.Add, pushChange))
    .on('change', createChangeProvider(FSEventType.Change, pushChange))
    .on('unlink', createChangeProvider(FSEventType.Remove, pushChange));

  if (configuration.directories.pages !== configuration.directories.layouts) {
    // Watches for the layouts change.
    Directory(configuration.directories.layouts)
      .recursive(true)
      .watch()
      .on('add', createChangeProvider(FSEventType.Add, pushChange))
      .on('change', createChangeProvider(FSEventType.Change, pushChange))
      .on('unlink', createChangeProvider(FSEventType.Remove, pushChange));
  }

  if (configuration.directories.api) {
    if (Array.isArray(configuration.directories.api)) {
      configuration.directories.api.map(Directory).forEach((directory) =>
        directory
          .recursive(true)
          .watch()
          .on('add', createChangeProvider(FSEventType.Add, pushChange))
          .on('change', createChangeProvider(FSEventType.Change, pushChange))
          .on('unlink', createChangeProvider(FSEventType.Remove, pushChange))
      );
    } else {
      Directory(configuration.directories.api)
        .recursive(true)
        .watch()
        .on('add', createChangeProvider(FSEventType.Add, pushChange))
        .on('change', createChangeProvider(FSEventType.Change, pushChange))
        .on('unlink', createChangeProvider(FSEventType.Remove, pushChange));
    }
  }

  // Sets up the development server.
  await startServer(configuration, {
    server: {
      host: options.allowRequestsFromPublicAddresses,
      // Set this property, so we can compare the open property from the config file
      // and leave only the one with the highest priority.
      $$openByCLI: determineBrowserAutoOpening(options.autoOpenBrowser, options.startUrl)
    }
  });
};

/**
 * @param {string | boolean} browser
 * @param {string} url
 * @param {boolean | string} [host]
 */
export const previewProject = async (browser, url, host) => {
  /** @type {import("../configuration/defaults.js").Configuration} */
  const configuration = Container.get(CONFIGURATION_ID);

  const outputDirectory = Directory(configuration.directories.output);

  if (!outputDirectory.exists()) {
    await buildProject();
  }

  await startPreviewServer(configuration, {
    preview: {
      host,
      // Set this property, so we can compare the open property from the config file
      // and leave only the one with the highest priority.
      $$openByCLI: determineBrowserAutoOpening(browser, url)
    }
  });
};
