import {ok} from 'node:assert';

import mockFs from 'mock-fs';
import {it, beforeEach, afterEach, describe} from 'mocha';

import {Container} from '../../../lib/utils/container.js';
import {clearCache} from '../../../lib/bundler/cache.js';
import {getAllPages} from '../../../lib/bundler/page/entity.js';
import {parseFrontMatter} from '../../../lib/bundler/page/front-matter.js';
import {CONFIGURATION_ID} from '../../../lib/configuration/index.js';

describe('front-matter', function() {
  const defaultConfiguration = {
    directories: {
      pages: 'pages',
      output: 'out',
      contents: 'pages',
      includes: 'includes'
    },
    logger: {
      noColors: false
    }
  };

  const frontMatterWithTitle = `
title: 'About'
`;

  const frontMatterWithDescription = `
  description: 'Description'
  `;

  const frontMatterWithImage = `
  image: 'https://db.io/image/kjfhi.png'
  `;

  const frontMatterWithKeywords = `
  keywords: ['super', 'cool']
  `;

  const frontMatterWithAuthor = `
  author: 'Yevhen'
  `;

  const frontMatterWithLanguage = `
  language: 'uk'
  `;

  const frontMatterWithDraft = `
  draft: true
  `;

  const getPage = (name) => {
    const pages = getAllPages(defaultConfiguration);

    return pages.find((page) => page.url.includes(name));
  };

  beforeEach(function() {
    Container.set(CONFIGURATION_ID, defaultConfiguration);

    mockFs({
      pages: {
        'index.html.ejs': ''
      }
    });
  });

  it('should allow empty front matter data', function() {
    const page = getPage('index');

    const result = parseFrontMatter('', page.layout);

    ok(result === null);
  });

  it('should parse title', function() {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithTitle, page.layout);

    ok(/<title>About<\/title>/.test(result.tags));
    ok(/og:title/.test(result.tags));
  });

  it('should parse description', function() {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithDescription, page.layout);

    ok(/name="description" content="Description"/.test(result.tags));
    ok(/og:description/.test(result.tags));
  });

  it('should parse image', function() {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithImage, page.layout);

    ok(/og:image.+?content="https:\/\/db.io\/image\/kjfhi\.png"/.test(result.tags));
  });

  it('should parse keywords', function() {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithKeywords, page.layout);

    ok(/name="keywords" content="super, cool"/.test(result.tags));
  });

  it('should parse author', function() {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithAuthor, page.layout);

    ok(/name="author" content="Yevhen"/.test(result.tags));
  });


  it('should parse language', function() {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithLanguage, page.layout);

    ok(/og:locale.+?content="uk"/.test(result.tags));
    ok(result.html.lang === 'uk');
  });

  it('should parse draft', function() {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithDraft, page.layout);

    ok(result.draft);
  });

  afterEach(function() {
    mockFs.restore();

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
