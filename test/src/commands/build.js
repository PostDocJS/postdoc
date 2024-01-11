import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chdir } from 'node:process';
import Configuration from '../../../lib/configuration.js';
import { existsSync } from 'node:fs';

describe('build command', function () {
  const rootDirectory = process.cwd();
  const pathToPostdoc = resolve(rootDirectory, 'bin/postdoc.js');

  let tmpDir;
  before(async function (done) {
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

    done();
  });

  after(async function (done) {
    chdir(rootDirectory);
    await rm(tmpDir, { recursive: true });
    done();
  });

  test('check if build command produced folder with builded assets', async function() {
    const configuration = Configuration.get();

    spawnSync('npm', ['run', 'build'], { shell: true });

    const outputFolder = configuration.directories.output;

    const folderExists = existsSync(outputFolder);

    assert.equal(folderExists, true);

    const files = await readdir(outputFolder);

    assert.equal(files.length > 0, true);
  });
});
