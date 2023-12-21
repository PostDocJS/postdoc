import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { chdir } from "node:process";

describe("init command", function () {
  const rootDirectory = process.cwd();
  const pathToPostdoc = resolve(rootDirectory, "bin/postdoc.js");

  const expectedNames = [
    "assets",
    "docs",
    "src",
    "test",
    "node_modules",
    "nightwatch.json",
    "package.json",
    "postdoc.config.js",
    "vite.config.js",
  ];

  let tmpDir;
  beforeEach(async function (_, done) {
    tmpDir = await mkdtemp(join(tmpdir(), ".foo"));
    chdir(tmpDir);
    done();
  });

  afterEach(async function (_client, done) {
    chdir(rootDirectory);
    await rm(tmpDir, { recursive: true });
    done();
  });

  test("providing a --name option immediately start creating a project", async function () {
    const projectName = "my-project";

    spawnSync("node", [pathToPostdoc, "init", "--name", projectName]);

    const names = await readdir(projectName);

    assert.deepEqual(names.sort(), expectedNames.sort());
  });

  test("providing a dot --name should create project in current directory", async function () {
    const projectName = ".";

    spawnSync("node", [pathToPostdoc, "init", "--name", projectName]);

    const names = await readdir(tmpDir);

    assert.deepEqual(names.sort(), expectedNames.sort());
  });

  test("providing a dot --name in a non-empty folder should result in error message", async function () {
    const projectName = ".";

    await writeFile("test.js", "test");

    const initProcess = spawnSync("node", [
      pathToPostdoc,
      "init",
      "--name",
      projectName,
    ]);

    assert.equal(
      initProcess.stdout.toString().includes("directory is not empty"),
      true
    );
  });
});
