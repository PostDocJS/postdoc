import {ok} from 'node:assert';
import {cwd} from 'node:process';
import {dirname} from 'node:path';

import mockFs from 'mock-fs';
import {test, describe, beforeEach, afterEach} from 'mocha';

import {Container} from '../../lib/utils/container.js';
import {clearCache} from '../../lib/bundler/cache.js';
import {CONFIGURATION_ID} from '../../lib/configuration/index.js';
import {
  compilePage,
  createCompilerFor,
  defaultConfiguration
} from './utils.js';

describe('global API', function () {
  beforeEach(function () {
    Container.set(CONFIGURATION_ID, defaultConfiguration);

    mockFs({
      includes: {
        'world.ejs': 'Hello, world!'
      },
      pages: {
        first: {
          '_section.md': `
<div>
<%= !!page %>
</div>
`,
          'index.html.ejs': `
<html>
	<head></head>
	<body>
</body>
<%= !!page %>
<%- page.content %>
<%- page.sections.section %>
</html>
`,
          'index.md': `
<div>
<%= !!page %>
</div>
`
        },

        inner: {
          '_section1.md': `
<div>
Section: <%= page.url %>
<%- page.content || '' %>
<%- page.sections ? page.sections.section1 : '' %>
</div>
`,
          'index.html.ejs': `
<html>
	<head></head>
	<body>
</body>
Layout: <%= page.url %>
<%- page.content %>
<%- page.sections.section1 %>
</html>
`,
          'index.md': `
<div>
Content: <%= page.url %>
<%- page.content || '' %>
<%- page.sections ? page.sections.section1 : '' %>
</div>
`
        },
        'about.html.ejs': `
<%= __filename %>
<%= __dirname %>
`,

        'commonjs.html.ejs': `
<%
const process = require('process');

const cwd = process.cwd();
%>

<%= cwd %>
`,

        esmodules: {
          'index.html.ejs': `
<%
const module = await import$('./test.mjs');

const sum = module.add(1, 2);
%>

<%= sum %>
`,
          'test.mjs': 'export const add = (a, b) => a + b;'
        },

        'url-test-relative.html.ejs': `
<%= url('./image.png') %>
`,

        'url-test-absolute.html.ejs': `
<%= url('/image.png') %>
`,

        'url-project-relative.html.ejs': `
          <%= url('~/assets/image.png') %>
        `,
        
        'include-relative': {
          'index.html.ejs': `
<%- await include('./sibling') %>
`,
          'sibling.ejs': 'included file'
        },

        'include-global': {
          'index.html.ejs': `
<%- await include('world') %>
`
        }
      }
    });
  });

  test('the page variable should be available in a page\'s layout, content and section files', async function () {
    const html = await compilePage('first');

    const booleanRe = /true/g;

    let occurencesCount = 0;
    while (booleanRe.exec(html)) {
      occurencesCount++;
    }

    ok(occurencesCount === 3);
  });

  test('content and sections properties exist in page variable only for the layout file', async function () {
    const html = await compilePage('inner');

    const urlRe = /\/inner\/index.html/g;

    let occurencesCount = 0;
    while (urlRe.exec(html)) {
      occurencesCount++;
    }
    debugger;
    ok(occurencesCount === 3);
  });

  test('__filename and __dirname should be available', async function () {
    const {page, compile} = createCompilerFor('about');

    const html = await compile(page);

    ok(html.includes(page.layout.source()));
    ok(html.includes(dirname(page.layout.source())));
  });

  test('page should be able to load CommonJS modules', async function () {
    const html = await compilePage('commonjs');

    ok(html.includes(cwd()));
  });

  test('page should be able to load ESModules', async function () {
    const html = await compilePage('esmodules');

    ok(html.includes(3));
  });

  test('url function rebases the relative path into a relative path to the file from the output directory', async function () {
    const html = await compilePage('url-test-relative');

    ok(html.includes('../pages/image.png'));
  });

  test('url function returns the absolute path as is', async function () {
    const html = await compilePage('url-test-absolute');

    ok(html.includes('/image.png'));
  });

  test('url function rebases the project-wide relative path into a relative path from the output directory', async function () {
    const html = await compilePage('url-project-relative');

    ok(html.includes('../assets/image.png'));
  });

  test('include function can refer to another ejs file with relative path', async function () {
    const html = await compilePage('include-relative');

    ok(html.includes('included file'));
  });

  test('include function can refer to another ejs from global includes directory', async function () {
    const html = await compilePage('include-global');

    ok(html.includes('Hello, world!'));
  });

  afterEach(function () {
    mockFs.restore();

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
