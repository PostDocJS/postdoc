import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import {resolveConfigWithDir} from '../../lib/configuration/resolve.js';
import {initializeConfiguration} from '../../lib/configuration/index.js';
import {config as dotenvConfig} from 'dotenv';

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

    it('should load JSON config if no other types are present', async function(client) {
      await fs.writeFile(path.join(tmpDir, 'postdoc.json'), '{"server": {"force": true}}');
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"name":"testing-file"}');
  
      const {configuration} = await resolveConfigWithDir(tmpDir);
  
      client.assert.equal(configuration.server.force, true);
    });
  });
  describe('Injecting environment variables', function() {
    it('should replace the interpolation pattern with an environment variable with the pattern as the name', async function(client) {
      await fs.writeFile(path.join(tmpDir, '.env'), 'PROP_ENV = "cool secret value"');
      await fs.writeFile(path.join(tmpDir, 'postdoc.conf.js'), 'export default {prop: "${PROP_ENV}"}');
      await fs.writeFile(path.join(tmpDir, 'package.json'), '{"type":"module"}');

      dotenvConfig({path: path.join(tmpDir, '.env')});

      const {configuration} = await initializeConfiguration(tmpDir);
  
      client.assert.equal(configuration.prop, 'cool secret value');
    });
  });
  
});
