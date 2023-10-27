/**
 * In the current implementation, there appears to be a recursive embedding issue when a page attempts to compile with a layout template that contains a reference to its own content.
 * This results in the HTML of the page being nested within itself, leading to malformed and invalid HTML output.
 * This issue is particularly evident when attempting to compile a page like 'with-relative' that has a layout template designed to insert its own content.
 * When a page with a self-referencing layout template (like 'with-relative') is compiled, the resultant HTML is nested within itself.
 */

import fs from "fs-extra";
import os from "os";
import path from "path";
import process from "process";

import { Container } from "../../../../lib/utils/container.js";
import { CONFIGURATION_ID } from "../../../../lib/configuration/index.js";
import {
  clearCache,
  getCacheEntry,
  hasCacheEntry,
} from "../../../../lib/bundler/cache.js";
import {
  basicHtml,
  compilePage,
  createCompilerFor,
  defaultConfiguration,
} from "../../../bundler/utils.js";

describe("compile", function () {
  let tmpDir;
  let oldCwd;

  beforeEach(async function () {
    oldCwd = process.cwd();
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-compile"));
    process.chdir(tmpDir);
    Container.set(CONFIGURATION_ID, defaultConfiguration);

    const structure = {
      pages: {
        "inner-basic": {
          "index.ejs": basicHtml,
        },
        "draft.ejs": basicHtml,
        "draft.md": "--- draft: true ---",

        "index.ejs": "<%- page.content %>",
        "with-relative.ejs": `<html>
      <head></head>
      <body>
  <%- page.content %>
  </body>
  </html>`,
        "with-relative.md": "Wow",
        "about.ejs": basicHtml,
        "about.md": `
  ---
  title: 'About'
  ---
  `,
        "contacts.ejs": basicHtml,
        "contacts.md": `
  ---
  language: ro
  ---
  `,
        "html-with-attributes.ejs": `
  <html data-theme="light">
      <head></head>
      <body></body>
  </html>
  `,
        "html-with-attributes.md": `
  ---
  language: uk
  ---
  `,
        "html-with-lang-and-attributes.ejs": `
  <html lang="en" data-theme="light">
      <head></head>
      <body></body>
  </html>
  `,
        "html-with-lang-and-attributes.md": `
  ---
  language: uk
  ---
  `,
      },
    };

    await createDirectoriesAndFiles(tmpDir, structure);
  });

  async function createDirectoriesAndFiles(directory, structure) {
    for (const [name, content] of Object.entries(structure)) {
      const newPath = path.join(directory, name);
      if (typeof content === "object") {
        await fs.mkdir(newPath);
        await createDirectoriesAndFiles(newPath, content);
      } else {
        await fs.writeFile(newPath, content);
      }
    }
  }

  //   it('should compile a page to HTML without relative content file', async function (client) {
  //     const html = await compilePage('index');

  //     client.assert.strictEqual(html, '<p>foo</p>');
  //   });

  //   it('should compile a page to HTML with relative content file', async function (client) {
  //     const html = await compilePage('with-relative');
  //     console.dir(html);
  //     client.assert.ok(/<body>\s+<p>Wow<\/p>\s+<\/body>/.test(html));
  //   });

  //   it('should insert generated front matter into the head', async function (client) {
  //     const html = await compilePage('about');

  //     client.assert.ok(/<head><title>About/.test(html));
  //   });

  //   it('should insert language into the meta tag and as the lang attribute to the html tag', async function () {
  //     const html = await compilePage('contacts');

  //     ok(/<html lang="ro">/.test(html));
  //     ok(/<meta property="og:locale" content="ro">/.test(html));
  //   });

  //   it('should replace an existed lang attribute in the html and preserve other attributes', async function () {
  //     const html = await compilePage('html-with-lang-and-attributes');

  //     ok(/<html lang="uk" data-theme="light">/.test(html));
  //   });

  //   it('should add the lang tag to the html and preserve other attributes', async function () {
  //     const html = await compilePage('html-with-attributes');

  //     ok(/<html data-theme="light" lang="uk">/.test(html));
  //   });

  //   it('should return null if a content is marked as draft and not cache the content', async function () {
  //     const {page, compile} = createCompilerFor('draft');

  //     const html = await compile(page);

  //     ok(html === null);
  //     ok(!hasCacheEntry([page.layout.source()]));
  //   });

  //   it('should cache a successufully compiled page', async function () {
  //     const {page, compile} = createCompilerFor('index');

  //     const html = await compile(page);

  //     ok(hasCacheEntry([page.layout.source()]));
  //     ok(getCacheEntry([page.layout.source()]) === html);
  //   });

  //   it('should treat a directory with the index.html.ejs file as a page', function () {
  //     const {page} = createCompilerFor('inner-basic');

  //     ok(page.url === '/inner-basic/index.html');
  //   });

  afterEach(async function () {
    process.chdir(oldCwd);
    await fs.remove(tmpDir);

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
