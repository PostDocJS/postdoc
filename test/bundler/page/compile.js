import {strictEqual} from 'node:assert';

import mockFs from 'mock-fs';
import {it, beforeEach, afterEach, describe} from 'mocha';

import {Container} from '../../../lib/utils/container.js';
import {clearCache} from '../../../lib/bundler/cache.js';
import {getAllPages} from '../../../lib/bundler/page/entity.js';
import {CONFIGURATION_ID} from '../../../lib/configuration/index.js';
import {createPageCompiler} from '../../../lib/bundler/page/index.js';

describe('compile', function() {
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

  beforeEach(function() {
    Container.set(CONFIGURATION_ID, defaultConfiguration);

    mockFs({
      pages: {
        'index.html.ejs': '<p><%= \'foo\' %></p>'
      }
    });
  });

  it('comile a page to HTML', async function() {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const html = await compile(pages[0]);

    strictEqual(html, '<p>foo</p>');
  });

  afterEach(function() {
    mockFs.restore();

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
