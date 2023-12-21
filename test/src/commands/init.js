import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);

describe("init command", function () {
  const pathToPostdoc = resolve(__filename, "../../../../bin/postdoc.js");

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

  test("providing a --name option immediately start creating a project", function () {
    const workingDirectory = mkdtempSync(".foo-");
    const projectName = "my-project";

    spawnSync("node", [pathToPostdoc, "init", "--name", projectName], {
      cwd: workingDirectory,
    });

    const names = readdirSync(resolve(workingDirectory, projectName));

    assert.deepEqual(names.sort(), expectedNames.sort());

    rmSync(workingDirectory, { recursive: true });
  });

  test("providing a dot --name should create project in current directory", function () {
    const workingDirectory = mkdtempSync(".foo-");
    const projectName = ".";

    spawnSync("node", [pathToPostdoc, "init", "--name", projectName], {
      cwd: workingDirectory,
    });

    const names = readdirSync(workingDirectory);

    assert.deepEqual(names.sort(), expectedNames.sort());

    rmSync(workingDirectory, { recursive: true });
  });

  test("providing a dot --name in a non-empty folder should result in error message", async function () {
    const workingDirectory = mkdtempSync(".foo-");
    const projectName = ".";

    await writeFile(resolve(workingDirectory, "test.js"), "test");

    const initProcess = spawnSync(
      "node",
      [pathToPostdoc, "init", "--name", projectName],
      {
        cwd: workingDirectory,
      }
    );

    assert.equal(
      initProcess.stdout.toString().includes("directory is not empty"),
      true
    );

    rmSync(workingDirectory, { recursive: true });
  });
});
