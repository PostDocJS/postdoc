/**
 * @file Contains compiler for a single page.
 *   It handles only layouts and contents files.
 *   Other assets are handled by the third-party Vite
 *   bundler.
 *
 * @module bundler_page
 */

const path = require('path');
const process = require('process');
const {inspect} = require('util');

const ejs = require('ejs');
const {marked} = require('marked');

const {File} = require('../files.js');
const {Typography} = require('../logger/colors.js');
const {Configuration} = require('../configuration/index.js');
const {withURLSeparator} = require('../utils/url.js');
const {error, MessageBuilder, LineBuilder} = require('../logger/index.js');

const includesDirectory = path.join(
  process.cwd(),
  Configuration.directories.includes
);

const CLOSING_BODY_TAG = '</body>';
const CLOSING_HEAD_TAG = '</head>';

/**
 * Compiles the Markdown file.
 *
 * @param {ReturnType<typeof File>} file
 */
const compileMarkdown = (file) =>
  file
    .map(marked.parse)
    .content()
    .run()
    .then((result) =>
      result.extract((err) => {
        MessageBuilder()
          .line(
            LineBuilder()
              .text('The compilation of the')
              .phrase(Typography.bold(file.source()))
              .phrase('ends with a failure:')
              .build()
          )
          .line(inspect(err))
          .pipe(error);

        return '';
      })
    );

/**
 * Compiles one EJS page with all contents and includes.
 *
 * @param {import('./pages.js').Page} page
 * @param {ReturnType<typeof import('./pages.js').PublicApiOf>} api
 */
const compile = (page, api) =>
  page.layout.map(async (content) =>
    ejs.render(
      content,
      {
        ...api,
        page: {
          url: page.url,
          content: page.content.exists()
            ? await compileMarkdown(page.content)
            : '',
          sections: Object.assign(
            {},
            ...(await Promise.all(
              page.sections.map(async ({name, file}) => ({
                [name]: await compileMarkdown(file)
              }))
            ))
          )
        }
      },
      {root: [includesDirectory], views: [includesDirectory], async: true}
    )
      .then(
        (content) => content
          .replace(
            CLOSING_BODY_TAG,
            '<script type="module" src="~/node_modules/postdoc/lib/assets/files/client/manager.js"></script>\n'
              + CLOSING_BODY_TAG
          )
      )
      .then(
        (content) => page.script.exists()
          ? content.replace(
            /* eslint-disable */
              CLOSING_BODY_TAG,
              `<script type="module" src="${
                 withURLSeparator(page.script.source().replace(process.cwd(), '~'))
               }"></script>\n${CLOSING_BODY_TAG}`
            )
            /* eslint-enable */
          : content
      )
      .then(
        (content) => page.style.exists()
          ? content.replace(
            /* eslint-disable */
              CLOSING_HEAD_TAG,
              `<link rel="stylesheet" href="${
                withURLSeparator(page.style.source().replace(process.cwd(), '~'))
              }"/>\n${CLOSING_HEAD_TAG}`
            )
            /* eslint-enable */
          : content
      )
  );

/**
 * Builds a page and writes it to the temporal build directory.
 * It should be the processed by the Vite and outputted to the
 * *output* directory. The file at the _destination_ path will
 * be overwritten if there is one.
 *
 * @param {ReturnType<typeof import('./pages.js').PublicApiOf>} api
 */
exports.build =
  (api) =>
    /** @param {import('./pages.js').Page} page */
    (page) =>
      compile(page, api).setDestination(page.temporaryOutput.source()).write();
