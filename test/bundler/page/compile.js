import { ok, strictEqual } from "node:assert";

import mockFs from "mock-fs";
import { it, beforeEach, afterEach, describe } from "mocha";

import { Container } from "../../../lib/utils/container.js";
import { CONFIGURATION_ID } from "../../../lib/configuration/index.js";
import {
  clearCache,
  getCacheEntry,
  hasCacheEntry,
} from "../../../lib/bundler/cache.js";
import {
  basicHtml,
  compilePage,
  createCompilerFor,
  defaultConfiguration,
} from "../utils.js";

describe("compile", function () {
  beforeEach(function () {
    Container.set(CONFIGURATION_ID, defaultConfiguration);

    mockFs({
      pages: {
        "inner-basic": {
          "index.html.ejs": basicHtml,
        },
        "draft.html.ejs": basicHtml,
        "draft.md": "--- draft: true ---",

        "index.html.ejs": "<p><%= 'foo' %></p>",
        "with-relative.html.ejs": `<html>
	<head></head>
	<body>
<%- page.content %>
</body>
</html>`,
        "with-relative.md": "Wow",
        "about.html.ejs": basicHtml,
        "about.md": `
---
title: 'About'
---
`,
        "contacts.html.ejs": basicHtml,
        "contacts.md": `
---
language: ro
---
`,
        "html-with-attributes.html.ejs": `
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
        "html-with-lang-and-attributes.html.ejs": `
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
    });
  });

  it("should compile a page to HTML without relative content file", async function () {
    const html = await compilePage("index");

    strictEqual(html, "<p>foo</p>");
  });

  it("should compile a page to HTML with relative content file", async function () {
    const html = await compilePage("with-relative");

    ok(/<body>\s+<p>Wow<\/p>\s+<\/body>/.test(html));
  });

  it("should insert generated front matter into the head", async function () {
    const html = await compilePage("about");

    ok(/<head><title>About/.test(html));
  });

  it("should insert language into the meta tag and as the lang attribute to the html tag", async function () {
    const html = await compilePage("contacts");

    ok(/<html lang="ro">/.test(html));
    ok(/<meta property="og:locale" content="ro">/.test(html));
  });

  it("should replace an existed lang attribute in the html and preserve other attributes", async function () {
    const html = await compilePage("html-with-lang-and-attributes");

    ok(/<html lang="uk" data-theme="light">/.test(html));
  });

  it("should add the lang tag to the html and preserve other attributes", async function () {
    const html = await compilePage("html-with-attributes");

    ok(/<html data-theme="light" lang="uk">/.test(html));
  });

  it("should return null if a content is marked as draft and not cache the content", async function () {
    const { page, compile } = createCompilerFor("draft");

    const html = await compile(page);

    ok(html === null);
    ok(!hasCacheEntry([page.layout.source()]));
  });

  it("should cache a successufully compiled page", async function () {
    const { page, compile } = createCompilerFor("index");

    const html = await compile(page);

    ok(hasCacheEntry([page.layout.source()]));
    ok(getCacheEntry([page.layout.source()]) === html);
  });

  it("should treat a directory with the index.html.ejs file as a page", function () {
    const { page } = createCompilerFor("inner-basic");

    ok(page.url === "/inner-basic/index.html");
  });

  afterEach(function () {
    mockFs.restore();

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
