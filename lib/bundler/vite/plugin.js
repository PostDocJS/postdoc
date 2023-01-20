/**
 * @file contains a plugin for lazy compiling and handling
 *  static pages.
 *
 * @module vite-plugin-postdoc
 */

import {extname} from 'node:path';

import {Stream} from '../../utils/stream.js';
import {getAllPages} from '../page/entity.js';
import {createPageCompiler} from '../page/index.js';
import {createErrorOverlay} from './error-overlay.js';
import {HTML_SUFFIX, URL_DELIMITER} from '../../constants.js';
import {addCacheEntry, getCacheEntry} from '../cache.js';

/**
 * @param {string} url
 * @param {string} neededMiddleSuffix
 * @param {string} [neededFinalSuffix] 
 * @returns {string}
 */
const resolveURLSuffix = (url, neededMiddleSuffix, neededFinalSuffix = '') => 
  url.endsWith(URL_DELIMITER)
    ? `${url}index${neededMiddleSuffix}${neededFinalSuffix}`
    : url.endsWith(HTML_SUFFIX)
      ? `${url}${neededFinalSuffix}`
      : `${url}${URL_DELIMITER}index${neededMiddleSuffix}${neededFinalSuffix}`;

/** Channel used for notifying clients about page changes. */
export const pageEventsChannel = Stream();

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

    configureServer: ({
      ws,
      middlewares: app,
      ssrFixStacktrace,
      transformIndexHtml
    }) => () => {
      pageEventsChannel.forEach(({type, payload}) => {
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
          url.endsWith(HTML_SUFFIX)
            || url.endsWith(URL_DELIMITER)
            || extname(url) === ''
        ) {
          currentPageUrl = resolveURLSuffix(url, HTML_SUFFIX);

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

            let html = getCacheEntry([page.output.source()]);

            // Check for the transformed HTML.
            if (!html) {
              let rawHtml = getCacheEntry([page.layout.source()]);

              // Check for the compiled HTML.
              // It may be empty right after the web server is started.
              if (!rawHtml) {
                const compile = createPageCompiler(allPages);

                rawHtml = await compile(page);
              }

              html = await transformIndexHtml(request.originalUrl, rawHtml);

              addCacheEntry([page.output.source()], html);
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
