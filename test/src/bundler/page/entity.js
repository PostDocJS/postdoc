import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import fs from 'fs-extra';

import {clearCache} from '../../../../lib/bundler/cache.js';
import {getAllPages} from '../../../../lib/bundler/page/entity.js';
import {Container} from '../../../../lib/utils/container.js';
import {CONFIGURATION_ID} from '../../../../lib/configuration/index.js';
import {defaultConfiguration} from '../../../bundler/utils.js';

describe('page entity', function () {
  let tmpDir;
  let oldCwd;

  beforeEach(async function (client, done) {
    oldCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-index'));
    Container.set(CONFIGURATION_ID, defaultConfiguration);
    await fs.mkdir(path.join(tmpDir, 'pages'));
    process.chdir(tmpDir);
    done();
  });

  afterEach(async function (client, done) {
    await fs.remove(tmpDir);
    clearCache();
    process.chdir(oldCwd);
    done();
  });

  it('should skip building a page for the file that starts with an underscore', async function (client) {
    await fs.writeFile(
      path.join('pages', 'index.layout.ejs'),
      'I am an index page'
    );
    await fs.writeFile(path.join('pages', '_index.md'), '');

    const pages = getAllPages(defaultConfiguration);

    client.assert.strictEqual(pages.length, 0);
  });

  it('should skip readme.md and license.md files', async function (client) {
    await fs.writeFile(
      path.join('pages', 'index.layout.ejs'),
      'I am an index page'
    );
    await fs.writeFile(path.join('pages', 'readme.md'), '');
    await fs.writeFile(path.join('pages', 'license.md'), '');

    const pages = getAllPages(defaultConfiguration);

    client.assert.strictEqual(pages.length, 0);
  });

  it('should skip files that matches the .draft.md suffix', async function (client) {
    await fs.writeFile(
      path.join('pages', 'index.layout.ejs'),
      'I am an index page'
    );
    await fs.writeFile(path.join('pages', 'foo.draft.md'), '');

    const pages = getAllPages({
      ...defaultConfiguration,
      ignore: {pages: ['**/*.draft.md']}
    });

    client.assert.strictEqual(pages.length, 0);
  });
});
