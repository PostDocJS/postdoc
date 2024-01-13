import { spawnSync, spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chdir } from 'node:process';
import { rmSync } from 'node:fs';
import kill from 'tree-kill';

describe('preview command', function () {
  const rootDirectory = process.cwd();
  const pathToPostdoc = resolve(rootDirectory, 'bin/postdoc.js');

  let tmpDir;
  let commandProcess;
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

    commandProcess = await new Promise((resolve, reject) => {
      const childProcess = spawn('npm', ['run', 'preview'], {
        cwd: tmpDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      childProcess.stdout.on('data', (chunk) => {
        output += chunk.toString();

        if (/https?:\/\/\S+/.test(output)) {
          resolve(childProcess);
        }
      });

      childProcess.on('exit', reject);
    });

    done();
  });

  after(function (_, done) {
    kill(commandProcess.pid, 'SIGTERM', () => {
      chdir(rootDirectory);
      rmSync(tmpDir, { recursive: true });
      done();
    });
  });

  test('check if preview command runs static server', async function(browser) {
    browser
      .navigateTo('http://localhost:4173/')
      .waitForElementVisible('body').window.close();
  });
});
