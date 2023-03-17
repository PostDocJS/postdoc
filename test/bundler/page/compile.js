import { ok, strictEqual } from "node:assert";

import mockFs from "mock-fs";
import { it, beforeEach, afterEach, describe } from "mocha";

import { Container } from "../../../lib/utils/container.js";
import { getAllPages } from "../../../lib/bundler/page/entity.js";
import { CONFIGURATION_ID } from "../../../lib/configuration/index.js";
import { createPageCompiler } from "../../../lib/bundler/page/index.js";
import {
  clearCache,
  getCacheEntry,
  hasCacheEntry,
} from "../../../lib/bundler/cache.js";

describe("compile", function () {
  const defaultConfiguration = {
    directories: {
      pages: "pages",
      output: "out",
      contents: "pages",
      includes: "includes",
    },
    logger: {
      noColors: false,
    },
  };

  beforeEach(function () {
    Container.set(CONFIGURATION_ID, defaultConfiguration);

    mockFs({
      pages: {
        "draft.html.ejs": `<html>
	<head></head>
	<body>
</body>
</html>`,
        "draft.md": "--- draft: true ---",

        "index.html.ejs": "<p><%= 'foo' %></p>",
        "with-relative.html.ejs": `<html>
	<head></head>
	<body>
<%- page.content %>
</body>
</html>`,
        "with-relative.md": "Wow",
        "about.html.ejs": `
<html>
	<head></head>
	<body></body>
</html>
`,
        "about.md": `
---
title: 'About'
---
`,
        "contacts.html.ejs": `
<html>
	<head></head>
	<body></body>
</html>
`,
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
      },
    });
  });

  it("should compile a page to HTML without relative content file", async function () {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const indexPage = pages.find((page) => page.url.includes("index"));

    const html = await compile(indexPage);

    strictEqual(html, "<p>foo</p>");
  });

  it("should compile a page to HTML with relative content file", async function () {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const withRelativePage = pages.find((page) =>
      page.url.includes("with-relative")
    );

    const html = await compile(withRelativePage);

    ok(/<body>\s+<p>Wow<\/p>\s+<\/body>/.test(html));
  });

  it("should insert generated front matter into the head", async function () {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const aboutPage = pages.find((page) => page.url.includes("about"));

    const html = await compile(aboutPage);

    ok(/<head><title>About/.test(html));
  });

  it("should insert language into the meta tag and as the lang attribute to the html tag", async function () {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const contactsPage = pages.find((page) => page.url.includes("contacts"));

    const html = await compile(contactsPage);

    ok(/<html lang="ro">/.test(html));
    ok(/<meta property="og:locale" content="ro">/.test(html));
  });

  it("should add the lang tag to the html and preserve other attributes", async function () {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const htmlWithAttributesPage = pages.find((page) =>
      page.url.includes("html-with-attributes")
    );

    const html = await compile(htmlWithAttributesPage);

    ok(/<html data-theme="light" lang="uk">/.test(html));
  });

  it("should return null if a content is marked as draft and not cache the content", async function () {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const draftPage = pages.find((page) => page.url.includes("draft"));

    const html = await compile(draftPage);

    ok(html === null);
    ok(!hasCacheEntry([draftPage.layout.source()]));
  });

  it("should cache a successufully compiled page", async function () {
    const pages = getAllPages(defaultConfiguration);

    const compile = createPageCompiler(pages);

    const indexPage = pages.find((page) => page.url.includes("index"));

    const html = await compile(indexPage);

    ok(hasCacheEntry([indexPage.layout.source()]));
    ok(getCacheEntry([indexPage.layout.source()]) === html);
  });

  afterEach(function () {
    mockFs.restore();

    Container.remove(CONFIGURATION_ID);

    clearCache();
  });
});
