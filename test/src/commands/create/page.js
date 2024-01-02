import assert from "node:assert/strict";
import { chdir } from "node:process";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { join, parse } from "node:path";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";

import Configuration from "../../../../lib/configuration.js";

describe("create pages command", function () {
  const rootDirectory = process.cwd();
  const pathToPostdoc = resolve(rootDirectory, "bin/postdoc.js");

  let tmpDir;
  before(async function () {
    tmpDir = await mkdtemp(join(tmpdir(), ".foo"));
    chdir(tmpDir);

    spawnSync("node", [pathToPostdoc, "init", "--name", "."]);

    const filename = "package.json";
    const fileContent = await readFile(filename, "utf8");
    const finalContent = fileContent.replace(
      /"postdoc":\s*"(.*?)"/g,
      `"postdoc": "file:${rootDirectory.replaceAll("\\", "/")}"`
    );
    await writeFile(filename, finalContent);

    spawnSync("npm", ["install"], {shell: true});

    await Configuration.initialise({});
  });

  after(async function () {
    chdir(rootDirectory);
    await rm(tmpDir, { recursive: true });
  });

  it("providing a url without extension should create correct files", async function () {
    const filename = "foo";

    spawnSync("npx", ["postdoc", "create", "page", "-n", filename], {shell: true});

    const configuration = Configuration.get();

    const pagesFiles = await readdir(configuration.directories.content);

    assert.equal(
      pagesFiles.some((f) => f === `${filename}.md`),
      true
    );

    const testPageObjectsFiles = await readdir(
      join(configuration.directories.tests, "page-objects")
    );

    assert.equal(
      testPageObjectsFiles.some((f) => f === `${filename}.cjs`),
      true
    );

    const testSrcFiles = await readdir(
      join(configuration.directories.tests, "src")
    );

    assert.equal(
      testSrcFiles.some((f) => f === `${filename}.js`),
      true
    );
  });

  it("providing a url with extension should create correct files", async function () {
    const filenameWithExtension = "boo.md";
    const filenameWithoutExtension = parse(filenameWithExtension).name;

    spawnSync("npx", ["postdoc", "create", "page", "-n", filenameWithExtension], {shell: true});

    const configuration = Configuration.get();

    const pagesFiles = await readdir(configuration.directories.content);

    assert.equal(
      pagesFiles.some((f) => f === filenameWithExtension),
      true
    );

    const testPageObjectsFiles = await readdir(
      join(configuration.directories.tests, "page-objects")
    );

    assert.equal(
      testPageObjectsFiles.some((f) => f === `${filenameWithoutExtension}.cjs`),
      true
    );

    const testSrcFiles = await readdir(
      join(configuration.directories.tests, "src")
    );

    assert.equal(
      testSrcFiles.some((f) => f === `${filenameWithoutExtension}.js`),
      true
    );
  });

  it("providing a url without extension inside subfolder should create correct files", async function () {
    const subfolder = "coo";
    const filename = "foo";
    const url = `${subfolder}/${filename}`;

    spawnSync("npx", ["postdoc", "create", "page", "-n", url], {shell: true});

    const configuration = Configuration.get();

    const pagesFiles = await readdir(
      join(configuration.directories.content, subfolder)
    );

    assert.equal(
      pagesFiles.some((f) => f === `${filename}.md`),
      true
    );

    const testPageObjectsFiles = await readdir(
      join(configuration.directories.tests, "page-objects", subfolder)
    );

    assert.equal(
      testPageObjectsFiles.some((f) => f === `${filename}.cjs`),
      true
    );

    const testSrcFiles = await readdir(
      join(configuration.directories.tests, "src", subfolder)
    );

    assert.equal(
      testSrcFiles.some((f) => f === `${filename}.js`),
      true
    );
  });

  it("providing a url with extension inside subfolder should create correct files", async function () {
    const filenameWithExtension = "boo.md";
    const filenameWithoutExtension = parse(filenameWithExtension).name;
    const subfolder = "coo";
    const url = `${subfolder}/${filenameWithExtension}`;

    spawnSync("npx", ["postdoc", "create", "page", "-n", url], {shell: true});

    const configuration = Configuration.get();

    const pagesFiles = await readdir(
      join(configuration.directories.content, subfolder)
    );

    assert.equal(
      pagesFiles.some((f) => f === filenameWithExtension),
      true
    );

    const testPageObjectsFiles = await readdir(
      join(configuration.directories.tests, "page-objects", subfolder)
    );

    assert.equal(
      testPageObjectsFiles.some((f) => f === `${filenameWithoutExtension}.cjs`),
      true
    );

    const testSrcFiles = await readdir(
      join(configuration.directories.tests, "src", subfolder)
    );

    assert.equal(
      testSrcFiles.some((f) => f === `${filenameWithoutExtension}.js`),
      true
    );
  });
});
