const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {ok, strictEqual} = require('assert');

const {it, describe, afterEach} = require('mocha');

const {Directory} = require('../../../lib/files.js');

const workingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'init-command-'));
const postdocExecutablePath = path.resolve('bin', 'postdoc.js');
const artifactsDirectoryName = '__artifacts__';
const artifactsDirectory = path.join(workingDirectory, artifactsDirectoryName);

describe('init command', function () {
  afterEach(function () {
    fs.rmSync(artifactsDirectory, {force: true, recursive: true});
  });

  it('should init the project in an empty directory', function () {
    this.timeout(0);

    const {error} = spawnSync(
      'node',
      [postdocExecutablePath, 'init', artifactsDirectoryName],
      {cwd: workingDirectory, shell: true}
    );

    if (error) {
      throw error;
    }

    const files = Directory()
      .recursive(true)
      .setSource(artifactsDirectory)
      .files();

    ok(files.length > 0);
    ok(files.some((file) => file.source().endsWith('index.md')));
    ok(files.some((file) => file.source().endsWith('package.json')));
    ok(files.some((file) => file.source().endsWith('index.html.ejs')));
  });

  it('should exit early with a message if the destination directory is not empty', function () {
    fs.mkdirSync(artifactsDirectory);

    fs.writeFileSync(path.resolve(artifactsDirectory, 'test.md'), '');
    
    const {error, output} = spawnSync(
      'node',
      [postdocExecutablePath, 'init', artifactsDirectoryName],
      {cwd: workingDirectory, shell: true}
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
  });

  it('should infer the directory name', function () {
    this.timeout(0);

    fs.mkdirSync(artifactsDirectory);

    const {error} = spawnSync(
      'node',
      [postdocExecutablePath, 'init', '.'],
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

    strictEqual(name, artifactsDirectoryName);    
  });
});
