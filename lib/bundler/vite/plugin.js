/**
 * @file contains a plugin for lazy compiling and handling
 *  static pages.
 *
 * @module vite-plugin-postdoc
 */

import {resolve, extname} from 'node:path';

import {File} from '../../files.js';
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
      : `${url}/index${neededMiddleSuffix}${neededFinalSuffix}`;

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @returns {import('vite').Plugin}
 */
export const createPlugin = (postdocConfiguration) => ({
  name: 'postdoc',

  configureServer: ({
    middlewares: app,
    ssrFixStacktrace,
    transformIndexHtml
  }) => () => 
    app.use(async (request, response, next) => {
      const url = request.url;

      if (
        url.endsWith(HTML_SUFFIX)
        || url.endsWith(URL_DELIMITER)
        || extname(url) === ''
      ) {
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
        next(new Error(`Cannot find any page for ${request.url}`));
      }
    })
});
