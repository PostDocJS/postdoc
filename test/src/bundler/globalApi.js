import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import process from 'process';

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

  afterEach(async function () {
    process.chdir(oldCwd);
    await fs.remove(tmpDir);

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
