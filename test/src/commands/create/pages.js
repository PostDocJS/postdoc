import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { chdir } from "node:process";
import { tmpdir } from "node:os";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import Configuration from "../../../../lib/configuration.js";
import assert from "node:assert/strict";

const __filename = fileURLToPath(import.meta.url);

describe("create pages command", function () {
  const rootDirectory = process.cwd();
  const pathToPostdocRoot = resolve(__filename, "../../../../..");
  const pathToPostdoc = resolve(
    __filename,
    pathToPostdocRoot,
    "bin/postdoc.js"
  );

  let tmpDir;
  beforeEach(async function (_client, done) {
    chdir(tmpdir());
    tmpDir = await mkdtemp(".foo");
    chdir(tmpDir);

    spawnSync("node", [pathToPostdoc, "init", "--name", "."]);

    const filename = "package.json";
    const fileContent = await readFile(filename, "utf8");
    const finalContent = fileContent.replace(
      /"postdoc":\s*"(.*?)"/g,
      `"postdoc": "file:${pathToPostdocRoot.replaceAll("\\", "/")}"`
    );
    await writeFile(filename, finalContent);

    spawnSync("npm.cmd", ["install"]);

    done();
  });

  afterEach(async function (_client, done) {
    chdir(rootDirectory);
    await rm(tmpDir, { recursive: true });
    done();
  });

  test("providing a url should create correct files", async function () {
    const filename = "foo";

    spawnSync("npx.cmd", ["postdoc", "create", "pages", filename]);

    await Configuration.initialise({});
    const configuration = Configuration.get();

    const pagesFiles = await readdir(
      join(tmpDir, configuration.directories.pages)
    );

    assert.equal(
      pagesFiles.some((f) => f === `${filename}.md`),
      true
    );

    const testPageObjectsFiles = await readdir(
      join(tmpDir, configuration.directories.tests, "page-objects")
    );

    assert.equal(
      testPageObjectsFiles.some((f) => f === `${filename}.cjs`),
      true
    );

    const testSrcFiles = await readdir(
      join(tmpDir, configuration.directories.tests, "src")
    );

    assert.equal(
      testSrcFiles.some((f) => f === `${filename}.js`),
      true
    );
  });
});
