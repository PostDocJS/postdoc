import { spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve, basename } from "node:path";
import { chdir } from "node:process";
import Configuration from "../../lib/configuration.js";
import kill from "tree-kill";
import Logger from "../../lib/logger.js";

describe("Test pseudo global variables in ejs files", function () {
  const rootDirectory = process.cwd();
  const pathToPostdoc = resolve(rootDirectory, "bin/postdoc.js");

  let tmpDir;
  let commandProcess;
  before(async function (browser, done) {
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

    spawnSync("npm.cmd", ["install"]);

    await Configuration.initialise({});

    await Logger.initialise();

    commandProcess = spawn("npm.cmd", ["start"]);

    done();
  });

  after(async function (browser, done) {
    kill(commandProcess.pid, "SIGTERM", async function (err) {
      chdir(rootDirectory);
      await rm(tmpDir, { recursive: true });
      done();
    });
  });

  it("check if pseudo-global variables are available in ejs files", async function (browser) {
    const configuration = Configuration.get();

    const path = "globals";
    const pathToLayoutsFolder = join(configuration.directories.layouts, path);
    const pathToContentFolder = join(configuration.directories.content, path);
    const relativePathToFilenameInsideLayoutsFolder = join(pathToLayoutsFolder, "index.ejs");
    const relativePathToFilenameInsideContentFolder = join(pathToContentFolder, "index.md");

    await mkdir(pathToContentFolder);
    await mkdir(pathToLayoutsFolder);

    await writeFile(
      join("src", "js", "test-require.cjs"),
      `
module.exports = { text: "some text" };
`
    );

    await writeFile(
      join("src", "js", "test-import.js"),
      `
export const text = 'some text'
`
    );

    await writeFile(
      relativePathToFilenameInsideLayoutsFolder,
      `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5.0, minimum-scale=0.86"
        />
        <title><%= appSettings.name %></title>
      </head>
      <body>
        <span id="filename"><%= __filename %></span>
        <span id="dirname"><%= __dirname %></span>

        <% const testRequire = require('../../js/test-require.cjs'); %>
        <span id="test-require"><%= testRequire.text %></span>

        <% const testImport = await _import('../../js/test-import.js'); %>
        <span id="test-import"><%= testImport.text %></span>

        <span id="page-url"><%= page.url %></span>

        <span id="page-content"><%- page.content %></span>

        <script type="module" src="/src/js/base.js"></script>
      </body>
    </html>
    `
    );

    await writeFile(relativePathToFilenameInsideContentFolder, `
# What is {{appSettings.name}}

## Part 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

## Part 2

Lorem ipsum dolor sit amet, consectetur adipiscing elit.    
    `)

    const absolutePathToFilenameInsideLayoutsFolder = resolve(relativePathToFilenameInsideLayoutsFolder);

    browser
      .navigateTo(`${browser.baseUrl}/${path}/`)
      .waitForElementVisible("body")
      .assert.textEquals("#filename", absolutePathToFilenameInsideLayoutsFolder)
      .assert.textEquals("#dirname", dirname(absolutePathToFilenameInsideLayoutsFolder))
      .assert.textEquals("#test-require", "some text")
      .assert.textEquals("#test-import", "some text")
      .assert.textEquals("#page-url", `/${path}/index.html`)
      .assert.textContains("#page-content", `What is ${basename(tmpDir)}`);
  });
});
