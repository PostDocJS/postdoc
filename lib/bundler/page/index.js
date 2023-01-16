/**
 * @file Contains compiler for a single page.
 *   It handles only layouts and contents files.
 *   Other assets are handled by the third-party Vite
 *   bundler.
 *
 * @module bundler_page
 */

const {compileEjs} = require('./compile-ejs.js');
const {injectMeta} = require('./postprocessing.js');
const {createGlobalAPI} = require('../global.js');
const {compileMarkdown} = require('./compile-markdown.js');
const {
  getCacheEntry,
  hasCacheEntry,
  addCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts
} = require('../cache.js');

/**
 * Creates page's compiler that builds a page and writes it
 * to the output directory. The file at the _destination_ path
 * will be overwritten if there is one.
 *
 * @param {Array<import('./entity.js').Page>} pages
 */
exports.createPageCompiler =
  (pages) => 
    /**
     * @param {import('./entity.js').Page} page
     * @returns {Future<string, never>}
     */
    async (page) => {
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
          );

          pageContent[0] = frontMatter;
          pageContent[1] = content;

          addCacheEntry(contentKeyDescriptor, pageContent);
        }
      }

      // TODO: check for the current mode
      if (pageContent[0] && pageContent[0].draft) {
        return false;
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
        };

        addCacheEntry(sectionKeyDescriptor, section);

        return section;
      }));

      const layoutContent = await page.layout.content();

      return compileEjs(
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
      ).then(injectMeta(pageContent[0]));
    };
