/**
 * @file Contains compiler for a single page.
 *   It handles only layouts and contents files.
 *   Other assets are handled by the third-party Vite
 *   bundler.
 *
 * @module bundler_page
 */

import {env} from 'node:process';

import {Mode} from '../../mode.js';
import {compileEjs} from './compile-ejs.js';
import {postprocess} from './postprocessing.js';
import {createGlobalAPI} from '../global.js';
import {compileMarkdown} from './compile-markdown.js';
import {parseFrontMatter, splitFrontMatterAndContent} from './front-matter.js';
import {
  getCacheEntry,
  hasCacheEntry,
  addCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts
} from '../cache.js';
import {Container} from '../../utils/container.js';
import {CONFIGURATION_ID, createConfig} from '../../configuration/index.js';

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
    const Config = createConfig(Container.get(CONFIGURATION_ID));
    /** @type {import('../cache.js').KeyDescriptor} */
    const pageKeyDescriptor = [page.output.source(), page.layout.source()];

    /** @type {import('./front-matter.js').FrontMatter} */
    let frontMatter = {};
    let content = '';

    const [
      contentKeyDescriptor = pageKeyDescriptor.concat(page.content.source())
    ] = getCacheKeyDescriptorsByParts(
      pageKeyDescriptor.concat([page.content.source()])
    ).filter(
      descriptorShouldBeFor(page.content.source())
    );

    const frontMatterKeyDescriptor = contentKeyDescriptor.concat('front-matter'); 

    if (hasCacheEntry(contentKeyDescriptor)) {
      content = getCacheEntry(contentKeyDescriptor);
      frontMatter = getCacheEntry(frontMatterKeyDescriptor);
    } else if (page.isMD) {
      const [rawFrontMatter, rawContent] = splitFrontMatterAndContent(
        await page.content.content()
      );

      frontMatter = rawFrontMatter
        ? parseFrontMatter(rawFrontMatter, page.content.source())
        : {};

      if (frontMatter.draft && env.MODE !== Mode.Development) {
        return null;
      }

      const rawCompiledContent = await compileEjs(
        rawContent,
        createGlobalAPI({
          file: page.content,
          page,
          pages,
          descriptor: contentKeyDescriptor,
          parentData: {
            frontMatter
          }
        }),
        {
          filename: page.content.source(),
          Config
        }
      );

      content = await compileMarkdown(
        rawCompiledContent,
        page.content.source()
      );

      addCacheEntry(contentKeyDescriptor, content);
      addCacheEntry(frontMatterKeyDescriptor, frontMatter);
    } else {
      content = await compileEjs(
        await page.content.content(),
        createGlobalAPI({
          file: page.content,
          page,
          pages,
          descriptor: contentKeyDescriptor,
          parentData: {}
        }),
        {
          Config,
          filename: page.content.source()
        }
      );

      addCacheEntry(contentKeyDescriptor, content);
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
          frontMatter,
          layoutContent: content
        }
      }),
      {
        Config,
        filename: page.layout.source()
      }
    ).then(postprocess);

    addCacheEntry([page.output.source()], html);

    return html;
  };
