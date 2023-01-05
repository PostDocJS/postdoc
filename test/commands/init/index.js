const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {ok, strictEqual} = require('assert');

const {it, describe} = require('mocha');

const {Directory} = require('../../../lib/files.js');

describe('init command', function () {
  it('should init the project in an empty directory', function () {
    this.timeout(5000);

    const executablePath = path.resolve('bin', 'postdoc.js');

    const {error, signal} = spawnSync(
      'node',
      [executablePath, 'init', '__artifacts__'],
      {cwd: __dirname, shell: true}
    );

    if (error) {
      throw error;
    } 

    if (signal) {
      switch (signal) {
        case 'SIGKILL':
          throw new Error('Child process was unexpectedly killed.');
      }
    }

    const files = Directory()
      .recursive(true)
      .setSource(path.resolve(__dirname, '__artifacts__'))
      .files();

    ok(files.length > 0);
    ok(files.some((file) => file.source().endsWith('index.md')));
    ok(files.some((file) => file.source().endsWith('package.json')));
    ok(files.some((file) => file.source().endsWith('index.html.ejs')));
  });

  it('should exit early with a message if the destination directory is not empty', function () {
    const executablePath = path.resolve('bin', 'postdoc.js');

    const {error, output} = spawnSync(
      'node',
      [executablePath, 'init', '__artifacts__'],
      {cwd: __dirname, shell: true}
    );

    if (error) {
      throw error;
    }

    ok(
      output
        .filter(Boolean)
        .some(
          (buffer) => buffer.toString('utf8').includes('directory is not empty')
        )
    );

    fs.rmSync(path.resolve(__dirname, '__artifacts__'), {recursive: true});
  });

  it('should infer the directory name', function () {
    this.timeout(5000);

    const artifactsDirectory = path.resolve(__dirname, '__artifacts__');

    fs.mkdirSync(artifactsDirectory);

    const {error} = spawnSync(
      'node',
      [path.resolve('bin', 'postdoc.js'), 'init', '.'],
      {cwd: artifactsDirectory, shell: true}
    );

    if (error) {
      throw error;
    }

    const packageJson = fs.readFileSync(
      path.join(artifactsDirectory, 'package.json'),
      {encoding: 'utf8'}
    );

    const {name} = JSON.parse(packageJson);

    strictEqual(name, '__artifacts__');    
  });
});
