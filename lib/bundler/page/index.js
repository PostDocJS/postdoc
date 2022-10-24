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
const {Container} = require('../../utils/container.js');
const {tryExecute} = require('../../utils/result.js');
const {Typography} = require('../../logger/colors.js');
const {compileMarkdown} = require('./compile-markdown.js');
const {CONFIGURATION_ID} = require('../../configuration/index.js');
const {MessageBuilder, LineBuilder, error: logError} = require('../../logger/index.js');
const {
  injectMeta,
  injectMainStyle,
  injectMainScript,
  injectManagerScript
} = require('./postprocessing.js');

/**
 * Renders EJS template with a given data.
 * Handles errors occured while compilation.
 *
 * @param {string} content
 * @param {Object} data
 * @param {ejs.Options} options
 */
const renderEjs = (content, data, options) =>
  tryExecute(() => ejs.render(content, data, options))
    .extract((error) => {
      MessageBuilder()
        .line(
          LineBuilder()
            .text('An error occured while rendering')
            .phrase(Typography().bold(options.filename.replace(process.cwd(), '')))
            .phrase('template.')
            .map(Typography().red)
            .build()
        )
        .line(Typography().red(error.toString()))
        .pipe(logError);

      return '';
    });

/**
 * @param {import('../../files.js').IFile} file
 * @returns {ejs.Options}
 */
const getEJSConfig = (file) => {
  const configuration = Container.get(CONFIGURATION_ID);

  const includesDirectory = path.join(
    process.cwd(),
    configuration.directories.includes
  );

  return {
    root: [includesDirectory],
    views: [includesDirectory],
    filename: file.source()
  };
};

/**
 * Builds a page and writes it to the temporal build directory.
 * It should be the processed by the Vite and outputted to the
 * *output* directory. The file at the _destination_ path will
 * be overwritten if there is one.
 *
 * @param {ReturnType<typeof import('../pages.js').PublicApiOf>} api
 */
exports.build =
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
            [name]: renderEjs(sectionContent, data, getEJSConfig(file))
          };
        }));

        page.layout
          .map(
            (layoutContent) => renderEjs(
              layoutContent,
              {
                ...data,
                page: {
                  ...data.page,
                  content: renderEjs(pageContent, data, getEJSConfig(page.content)),
                  sections: Object.assign({}, ...sections)
                }
              },
              getEJSConfig(page.layout)
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
  
