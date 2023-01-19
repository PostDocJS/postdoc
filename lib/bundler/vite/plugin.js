/**
 * @file contains a plugin for lazy compiling and handling
 *  static pages.
 *
 * @module vite-plugin-postdoc
 */

import {resolve, extname} from 'node:path';

import {File} from '../../files.js';
import {Stream} from '../../utils/stream.js';
import {createPageCompiler} from '../page/index.js';
import {getAllPages, createPage} from '../page/entity.js';
import {addCacheEntry, getCacheEntry} from '../cache.js';
import {HTML_SUFFIX, URL_DELIMITER, EJS_SUFFIX} from '../../constants.js';

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
export const changedPage = Stream();

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
      changedPage.forEach((pageUrl) => {
        if (pageUrl === currentPageUrl) {
          ws.send('postdoc:reload-page', {url: currentPageUrl});
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
            const layoutFilePath = resolve(
              postdocConfiguration.directories.pages,
              ...resolveURLSuffix(url, HTML_SUFFIX, EJS_SUFFIX).split(URL_DELIMITER)
            );

            const layoutPage = createPage(
              File(layoutFilePath),
              postdocConfiguration 
            );

            let html = getCacheEntry([layoutPage.output.source()]);

            if (!html) {
              const allPages = getAllPages(postdocConfiguration);

              const compile = createPageCompiler(allPages);

              const rawHtml = await compile(layoutPage);

              html = await transformIndexHtml(request.originalUrl, rawHtml);

              addCacheEntry([layoutPage.output.source()], html);
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
