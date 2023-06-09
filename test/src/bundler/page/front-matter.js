
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

import {Container} from '../../../../lib/utils/container.js';
import {clearCache} from '../../../../lib/bundler/cache.js';
import {getAllPages} from '../../../../lib/bundler/page/entity.js';
import {parseFrontMatter} from '../../../../lib/bundler/page/front-matter.js';
import {CONFIGURATION_ID} from '../../../../lib/configuration/index.js';
import process from 'process';

describe('front-matter', function() {
  const defaultConfiguration = {
    directories: {
      pages: 'pages',
      output: 'out',
      contents: 'pages',
      includes: 'includes',
      layouts: 'pages'
    },
    logger: {
      noColors: false
    },
    i18n: {
      languages: ['uk', 'de']
    }
  };

  let tmpDir;
  let oldCwd;

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

  beforeEach(async function() {
    oldCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-front-matter'));

    
    Container.set(CONFIGURATION_ID, defaultConfiguration);
    
    await fs.mkdir(path.join(tmpDir, 'pages'));
    await fs.writeFile(path.join(tmpDir, 'pages', 'index.html.ejs'), '');
    process.chdir(path.join(tmpDir));
  });

  it('should allow empty front matter data', function(client) {
    const page = getPage('index');
    const result = parseFrontMatter('', page.layout.name());
    client.assert.ok(result === null);
  });

  it('should parse title', function(client) {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithTitle, page.layout);
    client.assert.strictEqual(typeof result.title, 'string');
    client.assert.strictEqual(result.title, 'About');
  });

  it('should parse description', function(client) {
    const page = getPage('index');
    const result = parseFrontMatter(frontMatterWithDescription, page.layout);

    client.assert.strictEqual(typeof result.description, 'string');
    client.assert.strictEqual(result.description, 'Description');
  });

  it('should parse image', function(client) {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithImage, page.layout);
    client.assert.strictEqual(result.image, 'https://db.io/image/kjfhi.png');
  });

  it('should parse keywords', function(client) {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithKeywords, page.layout); 

    client.assert.ok(result.keywords.includes('super'));
    client.assert.ok(result.keywords.includes('cool'));
  });

  it('should parse author', function(client) {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithAuthor, page.layout);

    client.assert.strictEqual(typeof result.author, 'string');
    client.assert.strictEqual(result.author, 'Yevhen');
  });


  it('should parse language', function(client) {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithLanguage, page.layout);

    client.assert.strictEqual(typeof result.language, 'string');
    client.assert.strictEqual(result.language, 'uk');
  });

  it('should parse draft', function(client) {
    const page = getPage('index');

    const result = parseFrontMatter(frontMatterWithDraft, page.layout);

    client.assert.ok(result.draft);
  });


  afterEach(async function() {
    await fs.remove(tmpDir);

    Container.remove(CONFIGURATION_ID);
    clearCache();
    process.chdir(oldCwd);
  });
});
