import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chdir } from 'node:process';
import Configuration from '../../../lib/configuration.js';
import { runPreview } from '../../../lib/commands/preview.js';
import Logger from '../../../lib/logger.js';

describe('preview command', function () {
  const rootDirectory = process.cwd();
  const pathToPostdoc = resolve(rootDirectory, 'bin/postdoc.js');

  let tmpDir;
  before(async function (_, done) {
    tmpDir = await mkdtemp(join(tmpdir(), '.foo'));
    chdir(tmpDir);

    spawnSync('node', [pathToPostdoc, 'init', '--name', '.']);

    const filename = 'package.json';
    const fileContent = await readFile(filename, 'utf8');
    const finalContent = fileContent.replace(
      /"postdoc":\s*"(.*?)"/g,
      `"postdoc": "file:${rootDirectory.replaceAll('\\', '/')}"`
    );
    await writeFile(filename, finalContent);

    spawnSync('npm', ['install'], { shell: true });

    await Configuration.initialise({});

    await Logger.initialise();

    done();
  });

  after(async function (_, done) {
    chdir(rootDirectory);
    await rm(tmpDir, { recursive: true });
    done();
  });

  test('check if preview command runs static server', async function(browser) {
    const server = await runPreview();

    await browser
      .navigateTo('http://localhost:4173/')
      .waitForElementVisible('body').window.close();

    await new Promise((resolve, reject) => {
      server.httpServer.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
});
