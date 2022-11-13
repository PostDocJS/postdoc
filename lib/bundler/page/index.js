/**
 * @file Contains compiler for a single page.
 *   It handles only layouts and contents files.
 *   Other assets are handled by the third-party Vite
 *   bundler.
 *
 * @module bundler_page
 */

const {Future} = require('../../utils/future.js');
const {compileEjs} = require('../compile-ejs.js');
const {createGlobalAPI} = require('../global.js');
const {compileMarkdown} = require('./compile-markdown.js');
const {
  injectMeta,
  injectMainStyle,
  injectMainScript,
  injectManagerScript
} = require('./postprocessing.js');

/**
 * Creates page's compiler that builds a page and writes it
 * to the temporal build directory. It should be then processed
 * by the Vite and outputted to the *output* directory.
 * The file at the _destination_ path will be overwritten if there is one.
 *
 * @param {Array<import('../pages.js').Page>} pages
 */
exports.createPageCompiler =
  (pages) => 
    /** @param {import('../pages.js').Page} page */
    (page) =>
      Future(async (succeed, fail) => {
        /** @type {[import('./front-matter.js').Meta | null, string]} */
        let pageContent = page._cache.get(page.content.source());

        if (!pageContent) {
          const [frontMatter, rawPageContent] = page.content.exists()
            ? await compileMarkdown(
              page.content,
              {withFrontMatter: true}
            )
            : [null, ''];

          const content = await compileEjs(
            rawPageContent,
            createGlobalAPI({
              file: page.content,
              page,
              pages
            }),
            {filename: page.content.source()}
          )
            .run()
            .then(({extract}) => extract(() => ''));

          pageContent = [frontMatter, content];

          page._cache.set(page.content.source(), pageContent);
        }

        // TODO: check for the current mode
        if (pageContent[0] && pageContent[0].draft) {
          return succeed(false);
        }

        const sections = await Promise.all(page.sections.map(async ({name, file}) => {
          const sectionData = page._cache.get(file.source());

          if (sectionData) {
            return sectionData;
          }

          const [_, sectionContent] = await compileMarkdown(file);

          const section = {
            [name]: await compileEjs(
              sectionContent,
              createGlobalAPI({
                file,
                page,
                pages
              }),
              {filename: file.source()}
            )
              .run()
              .then(({extract}) => extract(() => ''))
          };

          page._cache.set(file.source(), section);

          return section;
        }));

        page.layout.content()
          .chain((layoutContent) => 
            compileEjs(
              layoutContent,
              createGlobalAPI({
                file: page.layout,
                page,
                pages,
                parentData: {
                  layoutContent: pageContent[1],
                  layoutSections: Object.assign({}, ...sections)
                } 
              }),
              {filename: page.layout.source()}
            )
          )
          .map(injectManagerScript)
          .map(injectMeta(pageContent[0]))
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
  
