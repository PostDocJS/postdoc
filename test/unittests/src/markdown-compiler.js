import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chdir } from "node:process";
import MarkdownCompiler from "../../../lib/markdown-compiler.js";
import Configuration from "../../../lib/configuration.js";

describe("MarkdownCompiler module", function () {
  const rootDirectory = process.cwd();

  let tmpDir;
  before(async function (done) {
    tmpDir = await mkdtemp(join(tmpdir(), "test-doc"));
    chdir(tmpDir);

    await Configuration.initialise({});

    done();
  });

  after(async function (done) {
    chdir(rootDirectory);
    await rm(tmpDir, { recursive: true });
    done();
  });

  test("should extract metadata from .md file", async function (client) {
    const filename = "file.md";

    await writeFile(
      filename,
      `---
draft: true
title: This title
---

# Main header

> Intelligence is the ability to avoid doing work, yet getting the work done.
> - Linus Torvalds`,
      "utf-8"
    );

    const markdownContent = await readFile(filename, "utf8");

    const markdownCompiler = new MarkdownCompiler();
    await markdownCompiler.initialise();

    const [attributes, content] = await markdownCompiler.compile(
      markdownContent
    );

    assert.equal(attributes.draft, true);
    assert.equal(attributes.title, "This title");
  });
});
