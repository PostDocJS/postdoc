import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {resolveConfigWithDir} from '../../lib/configuration/resolve.js';

describe('Configuration module', function() {
  let tmpDir;
  beforeEach(async function (client, done) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-doc'));
    done();
  });

  afterEach(async function (client, done) {
    await fs.remove(tmpDir);
    done();
  });

  describe('files priority', function() {
    it('should load the ES module config file at first', async function(client) {
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.mjs'), 'export default {server: {base: \'/root\'}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.cjs'), 'module.exports = {server: {port: 5698}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.js'), 'module.exports = {server: {strictPort: true}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.json'), '{"server": {"force: true}}');
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"name":"testing-file"}');
      const {configuration} = await resolveConfigWithDir(tmpDir);

      client.assert.equal(configuration.server.base, '/root');
    });
    it('should load CommonJS config if ES module is absent', async function(client) {
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.cjs'), 'module.exports = {server: {port: 5698}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.js'), 'module.exports = {server: {strictPort: true}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.json'), '{"server": {"force: true}}');
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"name":"testing-file"}');

      const {configuration} = await resolveConfigWithDir(tmpDir);

      client.assert.equal(configuration.server.port, 5698);
    });

    it('should load CommonJS config if package.json does not contain type: module', async function(client) {
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.js'), 'module.exports = {server: {strictPort: true}}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.json'), '{"server": {"force": true}}');
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"name":"testing-file"}');
    
      const {configuration} = await resolveConfigWithDir(tmpDir);
    
      client.assert.equal(configuration.server.strictPort, true);
    });

    it('should load the config as ES module if package.json contains the type: module', async function(client) {
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.js'), 'export default {server: {strictPort: true}, prop: "${PROP_ENV}"}');
      await fs.writeFile(path.join(tmpDir, 'postdoc.json'), '{"server": {"force": true}}');
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"name":"testing-file", "type":"module"}');
    
      const {configuration} = await resolveConfigWithDir(tmpDir);
    
      client.assert.equal(configuration.server.strictPort, true);
    });
    
  });
});
