/**
 * @file Contains compiler for a single page.
 *   It handles only layouts and contents files.
 *   Other assets are handled by the third-party Vite
 *   bundler.
 *
 * @module bundler_page
 */

import {compileEjs} from './compile-ejs.js';
import {injectMeta} from './postprocessing.js';
import {createGlobalAPI} from '../global.js';
import {compileMarkdown} from './compile-markdown.js';
import {
  getCacheEntry,
  hasCacheEntry,
  addCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts
} from '../cache.js';

/**
 * Creates page's compiler that builds a page and writes it
 * to the output directory. The file at the _destination_ path
 * will be overwritten if there is one.
 *
 * @param {Array<import('./entity.js').Page>} pages
 */
export const createPageCompiler = (pages) =>
  /**
   * @param {import('./entity.js').Page} page
   * @returns {Future<string | null, never>}
   */
  async (page) => {
    /** @type {import('../cache.js').KeyDescriptor} */
    const pageKeyDescriptor = [page.output.source(), page.layout.source()];

    let frontMatter = null;
    let content = '';

    const [
      contentKeyDescriptor = pageKeyDescriptor.concat(page.content.source())
    ] = getCacheKeyDescriptorsByParts(
      pageKeyDescriptor.concat([page.content.source()])
    ).filter(
      descriptorShouldBeFor(page.content.source())
    );

    if (hasCacheEntry(contentKeyDescriptor)) {
      [frontMatter, content] = getCacheEntry(contentKeyDescriptor);
    } else {
      const rawContent = await compileEjs(
        await page.content.content(),
        createGlobalAPI({
          file: page.content,
          page,
          pages,
          descriptor: contentKeyDescriptor
        }),
        {filename: page.content.source()}
      );

      [frontMatter, content] = await compileMarkdown(
        rawContent,
        {filename: page.content.source(), withFrontMatter: true}
      );

      addCacheEntry(contentKeyDescriptor, [frontMatter, content]);
    }

    // TODO: check for the current mode
    if (frontMatter && frontMatter.draft) {
      return null;
    }

    const layoutContent = await page.layout.content();

    const html = await compileEjs(
      layoutContent,
      createGlobalAPI({
        file: page.layout,
        page,
        pages,
        descriptor: pageKeyDescriptor,
        parentData: {
          layoutContent: content
        }
      }),
      {filename: page.layout.source()}
    ).then(injectMeta(frontMatter));

    addCacheEntry([page.output.source()], html);

    return html;
  };
