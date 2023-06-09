/**
 * @file contains a plugin for lazy compiling and handling
 *  static pages.
 *
 * @module vite-plugin-postdoc
 */

import {extname} from 'node:path';

import Stream from '@halo-lab/stream';

import {getAllPages} from '../page/entity.js';
import {createPageCompiler} from '../page/index.js';
import {createErrorOverlay} from './error-overlay.js';
import {createBroadcastingStream} from '../../utils/stream.js';
import {HTML_EXTENSION, URL_DELIMITER} from '../../constants.js';
import {addCacheEntry, getCacheEntry} from '../cache.js';


/**
 * @param {string} url
 * @returns {string}
 */
const resolveFullUrl = (url) =>
  url.endsWith(URL_DELIMITER)
    ? `${url}index${HTML_EXTENSION}`
    : url;

const [channel, push] = createBroadcastingStream();

/** Channel used for notifying clients about page changes. */
export const pushToClient = push;

/**
 * @enum {string}
 * @readonly
 */
export const PageEventType = {
  Add: '$add-page',
  Change: '$change-page',
  Remove: '$remove-page'
};

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @returns {import('vite').Plugin}
 */
export const createPlugin = (postdocConfiguration) => {
  let currentPageUrl = URL_DELIMITER;

  return {
    name: 'postdoc',

    config: (config, _envs) => {
      if (config.server) {
        if (typeof config.server.open !== 'string' || typeof config.server.$$openByCLI === 'string') {
          config.server.open = config.server.$$openByCLI;
        }

        delete config.server.$$openByCLI;
      }

      if (config.preview) {
        if (typeof config.preview.open !== 'string' || typeof config.preview.$$openByCLI === 'string') {
          config.preview.open = config.preview.$$openByCLI;
        }

        delete config.preview.$$openByCLI;
      }

      return config;
    },
    configureServer: ({
      ws,
      middlewares: app,
      ssrFixStacktrace,
      transformIndexHtml
    }) => () => {
      Stream.forEach(channel, ({type, payload}) => {
        switch (type) {
          case PageEventType.Change: {
            if (payload.url === currentPageUrl) {
              ws.send('postdoc:reload-page', {url: currentPageUrl});
            }
            break;
          }
          case PageEventType.Add:
          case PageEventType.Remove:
            ws.send('postdoc:reload-page');
        }
      });

      app.use(async (request, response, next) => {
        const url = request.url;

        if (
          url.endsWith(HTML_EXTENSION)
          || url.endsWith(URL_DELIMITER)
          || extname(url) === ''
        ) {
          currentPageUrl = resolveFullUrl(url);

          try {
            const allPages = getAllPages(postdocConfiguration);

            const page = allPages.find(({url}) => url === currentPageUrl);

            if (!page) {
              response.statusCode = 404;
              response.setHeader('Content-Type', 'text/html');
              response.end(
                createErrorOverlay(404, `The <b>${currentPageUrl}</b> page is not found.`)
              );

              return;
            }

            const transformedPageDescriptor = [page.url, page.output.source()];

            let html = getCacheEntry(transformedPageDescriptor);

            // Check for the transformed HTML.
            if (!html) {
              let nonTransformedHtml = getCacheEntry([page.output.source()]);

              // Check for the compiled HTML.
              // It may be empty right after the web server is started.
              if (!nonTransformedHtml) {
                const compile = createPageCompiler(allPages);

                nonTransformedHtml = await compile(page);
              }

              html = await transformIndexHtml(request.originalUrl, nonTransformedHtml);

              addCacheEntry(transformedPageDescriptor, html);
            }

            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/html');
            response.write(html);
            response.end();
          } catch (error) {
            ssrFixStacktrace(error);
            next(error);
          }
        } else {
          next();
        }
      });
    }
  };
};
