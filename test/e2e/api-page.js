import { spawn, spawnSync } from "child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { chdir } from "process";
import Configuration from "../../lib/configuration.js";
import Logger from "../../lib/logger.js";
import kill from "tree-kill";

describe("Test api page", function () {
  const rootDirectory = process.cwd();
  const pathToPostdoc = resolve(rootDirectory, "bin/postdoc.js");
  const apiPagesFolder = 'api-pages'

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


    const postdocConfigFilename = 'postdoc.config.js';
    let postdocConfigContent = await readFile(postdocConfigFilename, "utf8");
    postdocConfigContent = postdocConfigContent.replace(/\bsource: null\b/, `source: "./${apiPagesFolder}"`);
    await writeFile(postdocConfigFilename, postdocConfigContent);

    spawnSync("npm", ["install"], {shell: true});

    await Configuration.initialise({});

    await Logger.initialise();

    commandProcess = spawn("npm", ["start"], {shell: true});

    done();
  });

  after(async function (browser, done) {
    kill(commandProcess.pid, "SIGTERM", async function (err) {
      chdir(rootDirectory);
      await rm(tmpDir, { recursive: true });
      done();
    });
  });

  it("Check if api-page has proper comments", async function(browser) {
    await mkdir(apiPagesFolder);

    const pageFilename = 'boo';

    await writeFile(join(apiPagesFolder, `${pageFilename}.js`), `
/**
 * Function to add two numbers
 * @param {number} a 
 * @param {number} b 
 */
function sum(a, b){
  return a + b;
}
​
/**
* Function to subtract two numbers
* @param {number} a 
* @param {number} b 
*/
function diff(a, b){
  return a - b;
}
    `);

  await writeFile(join(apiPagesFolder, 'package.json'), `
{
  "name": "${apiPagesFolder}",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}  
  `);

  browser
    .navigateTo(`${join(browser.baseUrl), pageFilename}.html`)
    .waitForElementVisible("body");

  browser.element.findByText('sum').assert.visible();
  browser.element.findByText('Function to add two numbers').assert.visible();
  browser.element.findByText('diff').assert.visible();
  browser.element.findByText('Function to subtract two numbers').assert.visible();
  })
})