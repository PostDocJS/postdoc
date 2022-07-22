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

const ejs = require('ejs');

const {Future} = require('../../utils/future.js');
const {Configuration} = require('../../configuration/index.js');
const {compileMarkdown} = require('./compile-markdown.js');
const {
  injectMeta,
  injectMainStyle,
  injectMainScript,
  injectManagerScript
} = require('./postprocessing.js');

const includesDirectory = path.join(
  process.cwd(),
  Configuration.directories.includes
);

/** EJS render options. */
const renderOptions = {root: [includesDirectory], views: [includesDirectory]};

/**
 * Builds a page and writes it to the temporal build directory.
 * It should be the processed by the Vite and outputted to the
 * *output* directory. The file at the _destination_ path will
 * be overwritten if there is one.
 *
 * @param {ReturnType<typeof import('../pages.js').PublicApiOf>} api
 */
const build =
  (api) =>
    /** @param {import('../pages.js').Page} page */
    (page) =>
      Future(async (succeed, fail) => {
        const [pageMeta, pageContent] = page.content.exists()
          ? await compileMarkdown(
            page.content,
            {withFrontMatter: true}
          )
          : [null, ''];

        // TODO: check for the current mode
        if (pageMeta && pageMeta.draft) {
          return succeed(false);
        }

        /** Common page data. */
        const data = {
          ...api(page),
          page: {url: page.url}
        };

        const sections = await Promise.all(page.sections.map(async ({name, file}) => {
          const [_, sectionContent] = await compileMarkdown(file);

          return {
            [name]: ejs.render(sectionContent, data, renderOptions)
          };
        }));

        page.layout
          .map(
            (layoutContent) => ejs.render(
              layoutContent,
              {
                ...data,
                page: {
                  ...data.page,
                  content: ejs.render(pageContent, data, renderOptions),
                  sections: Object.assign({}, ...sections)
                }
              },
              renderOptions
            )
          )
          .map(injectManagerScript)
          .map(injectMeta(pageMeta))
          .map(injectMainScript(page))
          .map(injectMainStyle(page))
          .setDestination(page.temporaryOutput.source())
          .write()
          .run()
          .then((result) => result.map(succeed).mapErr(fail));
      });

exports.build = build;