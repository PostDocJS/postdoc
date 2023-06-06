import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import process from 'process';
import {dirname} from 'node:path';
import {cwd} from 'node:process';
import {Container} from '../../../lib/utils/container.js';
import {clearCache} from '../../../lib/bundler/cache.js';
import {CONFIGURATION_ID} from '../../../lib/configuration/index.js';
import {
  compilePage,
  createCompilerFor,
  defaultConfiguration
} from '../../bundler/utils.js';

describe('global API', function () {
  let tmpDir;
  let oldCwd;

  beforeEach(async function (client, done) {
    oldCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-api'));
    process.chdir(tmpDir);
    Container.set(CONFIGURATION_ID, defaultConfiguration);

    const structure = {
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
    };

    await createDirectoriesAndFiles(tmpDir, structure);
    done();
  });

  async function createDirectoriesAndFiles(directory, structure) {
    for (const [name, content] of Object.entries(structure)) {
      const newPath = path.join(directory, name);
      if (typeof content === 'object') {
        await fs.mkdir(newPath);
        await createDirectoriesAndFiles(newPath, content);
      } else {
        await fs.writeFile(newPath, content);
      }
    }
  }
  
  it('the page variable should be available in a pages layout, content and section files', async function (client) {
    const html = await compilePage('first');
    const booleanRe = /true/g;
    
    let occurencesCount = 0;
    while (booleanRe.exec(html)) {
      occurencesCount++;
    }
    
    client.assert.ok(occurencesCount === 2);
  });

  it('content and sections properties exist in page variable only for the layout file', async function (client) {
    const html = await compilePage('inner');

    const urlRe = /\/inner\/index.html/g;

    let occurencesCount = 0;
    while (urlRe.exec(html)) {
      occurencesCount++;
    }

    client.assert.ok(occurencesCount === 2);
  });

  it('__filename and __dirname should be available', async function (client) {
    const {page, compile} = createCompilerFor('about');

    const html = await compile(page);

    client.assert.ok(html.includes(page.layout.source()));
    client.assert.ok(html.includes(dirname(page.layout.source())));
  });

  it('page should be able to load CommonJS modules', async function (client) {
    const html = await compilePage('commonjs');

    client.assert.ok(html.includes(cwd()));
  });

  it('page should be able to load ESModules', async function (client) {
    const html = await compilePage('esmodules');

    client.assert.ok(html.includes(3));
  });

  it('url function rebases the relative path into a relative path to the file from the output directory', async function (client) {
    const html = await compilePage('url-test-relative');

    client.assert.ok(html.includes('../pages/image.png'));
  });

  it('url function returns the absolute path as is', async function (client) {
    const html = await compilePage('url-test-absolute');

    client.assert.ok(html.includes('/image.png'));
  });

  it('url function rebases the project-wide relative path into a relative path from the output directory', async function (client) {
    const html = await compilePage('url-project-relative');

    client.assert.ok(html.includes('../assets/image.png'));
  });

  it('include function can refer to another ejs file with relative path', async function (client) {
    const html = await compilePage('include-relative');

    client.assert.ok(html.includes('included file'));
  });

  it('include function can refer to another ejs from global includes directory', async function (client) {
    const html = await compilePage('include-global');

    client.assert.ok(html.includes('Hello, world!'));
  });

  afterEach(async function () {
    process.chdir(oldCwd);
    await fs.remove(tmpDir);

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
