const fs = require('fs');
const path = require('path');
const {ok} = require('assert');
const {spawnSync} = require('child_process');

const {it, describe} = require('mocha');

const {Directory} = require('../../../lib/files.js');

describe('init command', function () {
  it('should should init the project in an empty directory', function () {
    const {error, signal} = spawnSync('npx postdoc init __artifacts__', {cwd: __dirname, shell: true});

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
    const {error, output} = spawnSync('npx postdoc init __artifacts__', {cwd: __dirname, shell: true});

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

    fs.rmSync(path.resolve(__dirname, '__artifacts__'), {recursive: true, force: true});
  });
});
