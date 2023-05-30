import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {File} from '../../lib/files.js';

describe('The "files" abstraction over the Node\'s "fs" module', function () {
  let tmpDir;
  
  beforeEach(async function (client, done) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-files'));
    await fs.writeFile(path.join(tmpDir, 'existed-file.md'), 'content');
    await fs.mkdir(path.join(tmpDir, 'inner'));
    await fs.writeFile(path.join(tmpDir, 'inner', 'inner-file.md'), 'inner content');
    await fs.mkdir(path.join(tmpDir, 'toMove'));
    done();
  });

  afterEach(async function(client, done) {
    await fs.remove(tmpDir);
    done();
  });

  describe('File', async function () {
    it('should be a plain function', function (client) {
      client.assert.equal(typeof File, 'function');
    });

    it('should return an object', async function (client) {
      client.assert.equal(typeof File(), 'object');
    });

    it('should accept a "source" path while creating an instance', async function (client) {
      client.assert.equal(File().source(), null);
      client.assert.equal(File('foo').source(), 'foo');
    });
    it('should accept content transformers in the chainable way', async function (client) {
      const file = File();
      client.assert.ok(file.map);
      const self = file.map(() => {});
      client.assert.equal(file, self);
    });
  });
});
