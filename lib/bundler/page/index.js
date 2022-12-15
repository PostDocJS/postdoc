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
const {
  getCacheEntry,
  hasCacheEntry,
  addCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts
} = require('../cache.js');

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
        /** @type {import('../cache.js').KeyDescriptor} */
        const pageKeyDescriptor = [page.layout.source()];

        /**
         * The page's content file can be included only in one page, so
         * cache can contain many entries for content file, but the content
         * will be the same, so we can use any entry.
         *
         * @type {[import('./front-matter.js').Meta | null, string]}
         */
        const pageContent = [null, ''];

        if (page.content.source()) {
          const [
            contentKeyDescriptor = pageKeyDescriptor.concat(page.content.source())
          ] = getCacheKeyDescriptorsByParts(
            pageKeyDescriptor.concat([page.content.source()]) 
          ).filter(
            descriptorShouldBeFor(page.content.source())
          );
          
          if (hasCacheEntry(contentKeyDescriptor)) {
            const [frontMatter, content] = getCacheEntry(contentKeyDescriptor);

            pageContent[0] = frontMatter;
            pageContent[1] = content;
          } else {
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
                pages,
                descriptor: contentKeyDescriptor 
              }),
              {filename: page.content.source()}
            )
              .run()
              .then(({extract}) => extract(() => ''));

            pageContent[0] = frontMatter;
            pageContent[1] = content;

            addCacheEntry(contentKeyDescriptor, pageContent);
          }
        }

        // TODO: check for the current mode
        if (pageContent[0] && pageContent[0].draft) {
          return succeed(false);
        }

        const sections = await Promise.all(page.sections.map(async ({name, file}) => {
          const [
            sectionKeyDescriptor = pageKeyDescriptor.concat(file.source())
          ] = getCacheKeyDescriptorsByParts(
            pageKeyDescriptor.concat([file.source()]) 
          ).filter(
            descriptorShouldBeFor(file.source())
          );

          if (hasCacheEntry(sectionKeyDescriptor)) {
            return getCacheEntry(sectionKeyDescriptor);
          }

          const [_, sectionContent] = await compileMarkdown(file);

          const section = {
            [name]: await compileEjs(
              sectionContent,
              createGlobalAPI({
                file,
                page,
                pages,
                descriptor: sectionKeyDescriptor 
              }),
              {filename: file.source()}
            )
              .run()
              .then(({extract}) => extract(() => ''))
          };

          addCacheEntry(sectionKeyDescriptor, section);

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
                descriptor: pageKeyDescriptor,
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
  
