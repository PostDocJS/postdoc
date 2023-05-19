import {resolve} from 'node:path';
import {strictEqual} from 'node:assert';

import mockFs from 'mock-fs';
import mockRequire from 'mock-require';
import {it, afterEach, describe} from 'mocha';

import {resolveConfiguration} from '../lib/configuration/resolve.js';
import {initializeConfiguration} from '../lib/configuration/index.js';

const mockConfigurationFilesToLoad = () => {
  mockRequire(resolve('postdoc.conf.cjs'), {server: {port: 5698}});
  mockRequire(resolve('postdoc.conf.js'), {server: {strictPort: true}});
  mockRequire(resolve('postdoc.json'), {server: {force: true}});
};

describe('Configuration module', function() {
  describe('files priority', function() {
    it('should load the ES module config file at first', async function() {
      mockFs({
        'postdoc.conf.mjs': 'export default {server: {base: \'/root\'}}',
        'postdoc.conf.cjs': 'module.exports = {server: {port: 5698}}',
        'postdoc.conf.js': 'module.exports = {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      const {configuration} = await resolveConfiguration();

      strictEqual(configuration.server.base, '/root');
    });

    it('should load CommonJS config if ES module is absent', async function() {
      mockFs({
        'postdoc.conf.cjs': 'module.exports = {server: {port: 5698}}',
        'postdoc.conf.js': 'module.exports = {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      mockConfigurationFilesToLoad();

      const {configuration} = await resolveConfiguration();

      strictEqual(configuration.server.port, 5698);
    });

    it('should load CommonJS config if package.json does not contain type: module', async function() {
      mockFs({
        'postdoc.conf.js': 'module.exports = {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      mockConfigurationFilesToLoad();

      const {configuration} = await resolveConfiguration();

      strictEqual(configuration.server.strictPort, true);
    });

    it('should load the config as ES module if package.json contains the type: module', async function() {
      mockFs({
        // Unfortunately, we must declare property for the next suite here, because Node caches
        // first import and there is no way to invalidate the cache because it is not exposed yet.
        // https://github.com/nodejs/modules/issues/307#issuecomment-480353529
        'postdoc.conf.js': 'export default {server: {strictPort: true}, prop: "${PROP_ENV}"}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file", "type":"module"}'
      });

      const {configuration} = await resolveConfiguration();

      strictEqual(configuration.server.strictPort, true);
    });

    it('should load JSON config if no other types are present', async function() {
      mockFs({
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      mockConfigurationFilesToLoad();

      const {configuration} = await resolveConfiguration();

      strictEqual(configuration.server.force, true);
    });

    afterEach(function() {
      mockFs.restore();
      mockRequire.stopAll();
    });
  });

  describe('Injecting environment variables', function() {
    it('should replace the interpolation pattern with a environment variable with the pattern as the name', async function() {
      mockFs({
        '.env': 'PROP_ENV = "cool secret value"',
        'postdoc.conf.js': 'export default {prop: "${PROP_ENV}"}',
        'package.json': '{"type":"module"}'
      });
    
      const {configuration} = await initializeConfiguration();

      strictEqual(configuration.prop, 'cool secret value');
    });

    afterEach(function() {
      mockFs.restore();
    });
  });
});