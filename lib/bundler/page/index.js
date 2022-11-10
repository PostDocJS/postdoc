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
  Future(
    (succeed, fail) =>
      ejs.render(content, data, options)
        .catch((error) => {
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
        })
        .then(succeed, fail)
  );

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
    async: true,
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
            [name]: await renderEjs(sectionContent, data, getEJSConfig(file))
              .run()
              .then(({extract}) => extract(() => ''))
          };
        }));

        const content = await renderEjs(pageContent, data, getEJSConfig(page.content))
          .run()
          .then(({extract}) => extract(() => ''));

        page.layout.content()
          .chain((layoutContent) => 
            renderEjs(
              layoutContent,
              {
                ...data,
                page: {
                  ...data.page,
                  content,
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
          .chain((content) => 
            page.layout
              .map(() => content)
              .setDestination(page.temporaryOutput.source())
              .write()
          )
          .run()
          .then((result) => result.map(succeed).mapErr(fail));
      });
  
