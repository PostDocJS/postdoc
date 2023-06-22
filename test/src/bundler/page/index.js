import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import process from 'process';


import {clearCache} from '../../../../lib/bundler/cache.js';
import {getAllPages} from '../../../../lib/bundler/page/entity.js';
import {defaultConfiguration} from '../../../bundler/utils.js';
import {Container} from '../../../../lib/utils/container.js';
import {CONFIGURATION_ID} from '../../../../lib/configuration/index.js';

describe('page', function() {
  let tmpDir;
  let oldCwd;

  beforeEach(async function(client, done) {
    oldCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-index'));
    Container.set(CONFIGURATION_ID, defaultConfiguration);
    await fs.mkdir(path.join(tmpDir, 'pages'));
    process.chdir(tmpDir);
    done();
  });

  afterEach(async function(client, done) {
    await fs.remove(tmpDir);
    clearCache();
    process.chdir(oldCwd);
    done();
  });

  it('should create a page which consist only of the layout file', async function(client) {
    await fs.writeFile(path.join('pages', 'foo.layout.ejs'), 'I am a foo page');
    await fs.writeFile(path.join('pages', 'foo.md'), '');  // додати цей рядок
  
    const pages = getAllPages(defaultConfiguration);
  
    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/foo.html');
    client.assert.ok(pages[0].content.exists());
    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'foo.html'));
  });
  

  it('should create a page which consists of a layout file and a content file at the same level', async function(client) {
    await fs.writeFile(path.join('pages', 'foo.layout.ejs'), 'layout');
    await fs.writeFile(path.join('pages', 'foo.md'), 'content');
  
    const pages = getAllPages(defaultConfiguration);
    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/foo.html');
    client.assert.ok(pages[0].content.exists());
    client.assert.strictEqual(await pages[0].content.content(), 'content');
    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'foo.html'));
  });

  
  it('should create a page which consists of a named layout file and a scoped content file', async function(client) {
   
    await fs.writeFile(path.join('pages', 'foo.layout.ejs'), 'content'); 
    await fs.writeFile(path.join('pages', 'foo.md'), 'content');
    const pages = getAllPages(defaultConfiguration);
    
    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/foo.html');
    client.assert.ok(pages[0].content.exists());
    client.assert.strictEqual(await pages[0].content.content(), 'content');
    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'foo.html'));
  });
  
  
  it('should create a page which consist of a scoped layout file and a scoped content file', async function(client) {

    await fs.mkdir(path.join('pages', 'foo'));
    await fs.writeFile(path.join('pages', 'foo', 'index.layout.ejs'), 'layout');
    await fs.writeFile(path.join('pages', 'foo', 'index.md'), 'content');

    const pages = getAllPages(defaultConfiguration);

    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/foo/index.html');
    client.assert.ok(pages[0].content.exists());
    client.assert.strictEqual(await pages[0].content.content(), 'content');
    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'foo', 'index.html'));
  });

  it('should not pick up a named content file if the layout file is scoped', async function(client) {

    await fs.mkdir(path.join('pages', 'foo'));
    await fs.writeFile(path.join('pages', 'foo', 'index.layout.ejs'), 'layout');
    await fs.writeFile(path.join('pages', 'foo.md'), 'content');
    await fs.writeFile(path.join('pages', 'foo', 'index.md'), 'content');

    const pages = getAllPages(defaultConfiguration);
    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/foo/index.html');
    client.assert.ok(pages[0].content.exists());
    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'foo', 'index.html'));
  });

  it('should create a root index page with a root index layout and content file', async function(client) {
  

    await fs.writeFile(path.join('pages', 'index.layout.ejs'), 'layout');
    await fs.writeFile(path.join('pages', 'index.md'), 'content');

    const pages = getAllPages(defaultConfiguration);

    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/index.html');
    client.assert.ok(pages[0].content.exists());
    client.assert.strictEqual(await pages[0].content.content(), 'content');
    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'index.html'));
  });

  it('should not pick up a scoped content file for the root index layout file', async function(client) {

    await fs.mkdir(path.join('pages', 'index'));
    await fs.writeFile(path.join('pages', 'index.layout.ejs'), 'layout');
    await fs.writeFile(path.join('pages', 'index', 'index.md'), 'content');


    const pages = getAllPages(defaultConfiguration);

    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/index/index.html');
    client.assert.ok(pages[0].content.exists());

    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'index', 'index.html'));
  });
  
  it('should not collect sections on the same level as the non-index layout file', async function(client) {
    await fs.writeFile(path.join('pages', 'foo.layout.ejs'), 'layout');
    await fs.writeFile(path.join('pages', 'foo.md'), 'section1');

    const pages = getAllPages(defaultConfiguration);

    client.assert.strictEqual(pages.length, 1);
    client.assert.strictEqual(pages[0].url, '/foo.html');
    client.assert.ok(pages[0].content.exists());
    client.assert.strictEqual(pages[0].output.source(), path.join('out', 'foo.html'));
  });


});