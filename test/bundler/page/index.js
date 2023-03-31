import {join} from 'node:path';
import {ok, strictEqual} from 'node:assert';

import mockFs from 'mock-fs';
import {it, afterEach, describe} from 'mocha';

import {clearCache} from '../../../lib/bundler/cache.js';
import {getAllPages} from '../../../lib/bundler/page/entity.js';
import {defaultConfiguration} from '../utils.js';

describe('page', function() {
  afterEach(function() {
    mockFs.restore();
    clearCache();
  });

  it('should create a page which consist only of the layout file', function() {
    mockFs({
      pages: {
        'foo.html.ejs': 'I am a foo page'
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo.html');
    ok(!pages[0].content.exists());
    strictEqual(pages[0].sections.length, 0);
    strictEqual(pages[0].output.source(), join('out', 'foo.html'));
  });

  it('should create a page which consist of a layour file and a content file at the same level', async function() {
    mockFs({
      pages: {
        'foo.html.ejs': 'layout',
        'foo.md': 'content'
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo.html');
    ok(pages[0].content.exists());
    strictEqual(await pages[0].content.content(), 'content');
    strictEqual(pages[0].sections.length, 0);
    strictEqual(pages[0].output.source(), join('out', 'foo.html'));
  });

  it('should create a page which consist of a named layout file and a scoped content file', async function() {
    mockFs({
      pages: {
        'foo.html.ejs': 'layout',
        foo: {
          'index.md': 'content'
        }
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo.html');
    ok(pages[0].content.exists());
    strictEqual(await pages[0].content.content(), 'content');
    strictEqual(pages[0].sections.length, 0);
    strictEqual(pages[0].output.source(), join('out', 'foo.html'));
  });

  it('should create a page which consist of a scoped layout file and a scoped content file', async function() {
    mockFs({
      pages: {
        foo: {
          'index.html.ejs': 'layout',
          'index.md': 'content'
        }
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo/index.html');
    ok(pages[0].content.exists());
    strictEqual(await pages[0].content.content(), 'content');
    strictEqual(pages[0].sections.length, 0);
    strictEqual(pages[0].output.source(), join('out', 'foo', 'index.html'));
  });

  it('should not pick up a named content file if the layout file is scoped', function() {
    mockFs({
      pages: {
        foo: {'index.html.ejs': 'layout'},
        'foo.md': 'content'
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo/index.html');
    ok(!pages[0].content.exists());
    strictEqual(pages[0].sections.length, 0);
    strictEqual(pages[0].output.source(), join('out', 'foo', 'index.html'));
  });

  it('should create a root index page with a root index layout and content file', async function() {
    mockFs({
      pages: {
        'index.html.ejs': 'layout',
        'index.md': 'content'
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/index.html');
    ok(pages[0].content.exists());
    strictEqual(await pages[0].content.content(), 'content');
    strictEqual(pages[0].sections.length, 0);
    strictEqual(pages[0].output.source(), join('out', 'index.html'));
  });

  it('should not pick up a scoped content file for the root index layout file', function() {
    mockFs({
      pages: {
        'index.html.ejs': 'layout',
        index: {'index.md': 'content'}
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/index.html');
    ok(!pages[0].content.exists());
    strictEqual(pages[0].sections.length, 0);
    strictEqual(pages[0].output.source(), join('out', 'index.html'));
  });

  it('should collect scoped sections for the page', async function() {
    mockFs({
      pages: {
        'foo.html.ejs': 'layout',
        foo: {
          '_baz.md': 'section1',
          '_bar.md': 'section2'
        }
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo.html');
    ok(!pages[0].content.exists());
    strictEqual(Object.values(pages[0].sections).length, 2);
    ok('baz' in pages[0].sections);
    ok('bar' in pages[0].sections);
    strictEqual(await pages[0].sections.baz.content(), 'content1');
    strictEqual(await pages[0].sections.bar.content(), 'content2');
    strictEqual(pages[0].output.source(), join('out', 'foo.html'));
  });

  it('should not collect sections on the same level as the non-index layout file', function() {
    mockFs({
      pages: {
        'foo.html.ejs': 'layout',
        '_baz.md': 'section1',
        '_bar.md': 'section2'
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo.html');
    ok(!pages[0].content.exists());
    strictEqual(Object.values(pages[0].sections).length, 0);
    strictEqual(pages[0].output.source(), join('out', 'foo.html'));
  });

  it('should collect sections of the same level as the index layout file', async function() {
    mockFs({
      pages: {
        foo: {
          'index.html.ejs': 'layout',
          '_baz.md': 'section1',
          '_bar.md': 'section2'
        }
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo/index.html');
    ok(!pages[0].content.exists());
    strictEqual(Object.values(pages[0].sections).length, 2);
    ok('baz' in pages[0].sections);
    ok('bar' in pages[0].sections);
    strictEqual(await pages[0].sections.baz.content(), 'content1');
    strictEqual(await pages[0].sections.bar.content(), 'content2');
    strictEqual(pages[0].output.source(), join('out', 'foo', 'index.html'));
  });

  it('should collect sections and a content file for the page if they are on the same level', async function() {
    mockFs({
      pages: {
        'foo.html.ejs': 'layout',
        foo: {
          'index.md': 'content',
          '_baz.md': 'section1'
        },
        '_bar.md': 'section2'
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/foo.html');
    ok(pages[0].content.exists());
    strictEqual(Object.values(pages[0].sections).length, 1);
    ok('baz' in pages[0].sections);
    strictEqual(await pages[0].sections.baz.content(), 'content1');
    strictEqual(pages[0].output.source(), join('out', 'foo.html'));
  });

  it('should collect sections and a content file for the root index layout file only from the same level', async function() {
    mockFs({
      pages: {
        'index.html.ejs': 'layout',
        'index.md': 'content',
        '_baz.md': 'section1',
        index: {
          '_bar.md': 'section2'
        }
      }
    });

    const pages = getAllPages(defaultConfiguration);

    strictEqual(pages.length, 1);
    strictEqual(pages[0].url, '/index.html');
    ok(pages[0].content.exists());
    strictEqual(await pages[0].content.content(), 'content');
    strictEqual(Object.values(pages[0].sections).length, 1);
    ok('baz' in pages[0].sections);
    ok(!('bar' in pages[0].sections));
    strictEqual(await pages[0].sections.baz.content(), 'content1');
    strictEqual(pages[0].output.source(), join('out', 'index.html'));
  });
});
