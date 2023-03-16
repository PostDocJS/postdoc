import {join} from 'node:path';
import {ok, strictEqual} from 'node:assert';

import mockFs from 'mock-fs';
import {it, beforeEach, afterEach, describe} from 'mocha';

import {clearCache} from '../../../lib/bundler/cache.js';
import {getAllPages} from '../../../lib/bundler/page/entity.js';

describe('page', function () {
  const defaultConfiguration = {
    directories: {
      pages: 'pages',
      output: 'out',
      contents: 'pages',
      includes: 'includes'
    }
  };

  beforeEach(function () {
    mockFs({
      pages: {
        'index.html.ejs': '<p>main page</p>',
        'about.html.ejs': '<p>about page</p>',
        'about.md': 'content for the about page'
      }
    });
  });

  it('should collect all pages', function () {
    const pages = getAllPages(defaultConfiguration);

    ok(Array.isArray(pages));
    strictEqual(pages.length, 2);
  });

  it('should create a full information about the page', function () {
    const pages = getAllPages(defaultConfiguration);

    const aboutPage = pages.find((page) => page.url.includes('about'));

    strictEqual(aboutPage.url, '/about.html');
    ok(aboutPage.sections.length === 0);

    strictEqual(aboutPage.layout.source(), join('pages', 'about.html.ejs'));
    strictEqual(aboutPage.output.source(), join('out', 'about.html'));
    strictEqual(aboutPage.content.source(), join('pages', 'about.md'));
  });

  it('should return content of the page', async function () {
    const pages = getAllPages(defaultConfiguration);

    const aboutPage = pages.find((page) => page.url.includes('about'));

    strictEqual(
      await aboutPage.content.content(),
      'content for the about page'
    );
  });

  afterEach(function () {
    mockFs.restore();
    clearCache();
  });
});
