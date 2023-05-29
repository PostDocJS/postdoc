import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {resolveConfigWithDir} from '../../lib/configuration/resolve.js';

describe('Configuration module', function() {
  let tmpDir;
  before(async function (client, done) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-doc'));
    done();
  });

  after(async function (client, done) {
    await fs.remove(tmpDir);
    done();
  });

  describe('files priority', function() {
    it('should load the ES module config file at first', async function(client) {
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.mjs'), 'export default {server: {base: \'/root\'}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.cjs'), 'module.exports = {server: {port: 5698}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.js'), 'module.exports = {server: {strictPort: true}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.json'), '{"server": {"force": true}}');
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"name":"testing-file"}');
      const {configuration} = await resolveConfigWithDir(tmpDir);

      client.assert.equal(configuration.server.base, '/root');
    });
  });
});
