import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);

describe("init command", function () {
  test("providing a --name option immediately start creating a project", function () {
    const workingDirectory = mkdtempSync(".foo-");

    spawnSync(
      "node",
      [
        resolve(__filename, "../../../bin/postdoc.js"),
        "init",
        "--name",
        "my-project",
      ],
      {
        cwd: workingDirectory,
      },
    );

    const names = readdirSync(workingDirectory);

    const expectedNames = [
      "assets",
      "docs",
      "src",
      "test",
      "nightwatch.json",
      "package.json",
      "postdoc.config.js",
      "vite.config.js",
    ];

    for (const name of names) {
      if (!expectedNames.includes(name)) {
        rmSync(workingDirectory, { recursive: true });

        throw new Error(`Unexpected generated file: ${name}`);
      }
    }

    rmSync(workingDirectory, { recursive: true });
  });
});
