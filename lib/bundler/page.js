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
 * Injects the script to the Navigation manager into a page.
 * It's necessary to even empty pages will register the manager
 * after loading and establish the client-side navigation.
 *
 * @param {string} content
 */
const injectManagerScript = (content) => content
  .replace(
    CLOSING_BODY_TAG,
    '<script type="module" src="~/node_modules/postdoc/lib/assets/files/client/manager.js"></script>\n'
    + CLOSING_BODY_TAG
  );

/**
 * Injects the main page's script if there is any.
 *
 * @param {import('./pages.js').Page} page
 */
const injectMainScript = (page) =>
  /** @param {string} content */
  (content) => page.script.exists()
    ? content.replace(
      /* eslint-disable */
      CLOSING_BODY_TAG,
      `<script type="module" src="${
        withURLSeparator(page.script.source().replace(process.cwd(), '~'))
      }"></script>\n${CLOSING_BODY_TAG}`
    )
    /* eslint-enable */
    : content;

/**
 * Injects the main page's stylesheet file if there is any.
 *
 * @param {import('./pages.js').Page} page
 */
const injectMainStyle = (page) =>
  /** @param {string} content */
  (content) => page.style.exists()
    ? content.replace(
      /* eslint-disable */
      CLOSING_HEAD_TAG,
      `<link rel="stylesheet" href="${
        withURLSeparator(page.style.source().replace(process.cwd(), '~'))
      }"/>\n${CLOSING_HEAD_TAG}`
    )
    /* eslint-enable */
    : content;

/** EJS render options. */
const renderOptions = {root: [includesDirectory], views: [includesDirectory]};

/**
 * Compiles one EJS page with all contents and includes.
 *
 * @param {import('./pages.js').Page} page
 * @param {ReturnType<typeof import('./pages.js').PublicApiOf>} api
 */
const compile = (page, api) =>
 page.layout.map(async (layoutContent) => {
   const data = {
     ...api(page),
     page: { url: page.url }
   };

   const content = page.content.exists()
    ? ejs.render(await compileMarkdown(page.content), data, renderOptions)
    : '';

   const sections = await Promise.all(page.sections.map(async ({name, file}) => ({
     [name]: ejs.render(await compileMarkdown(file), data, renderOptions)
   })));

  const html = ejs.render(
    layoutContent,
    {
      ...data,
      page: {
        ...data.page,
        content,
        sections: Object.assign({}, ...sections)
      }
    },
    renderOptions
  );

  return injectMainStyle(page)(injectMainScript(page)(injectManagerScript(html)));
});

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
