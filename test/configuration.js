import {resolve} from 'node:path';
import {strictEqual} from 'node:assert';

import mockFs from 'mock-fs';
import mockRequire from 'mock-require';
import {it, afterEach, describe} from 'mocha';

import {resolveConfiguration} from '../lib/configuration/resolve.js';

const mockConfigurationFilesToLoad = () => {
  mockRequire(resolve('postdoc.conf.cjs'), {server: {port: 5698}});
  mockRequire(resolve('postdoc.conf.js'), {server: {strictPort: true}});
  mockRequire(resolve('postdoc.json'), {server: {force: true}});
};

describe('Configuration module', function () {
  describe('files priority', function () {
    it('should load the ES module config file at first', async function () {
      mockFs({
        'postdoc.conf.mjs': 'export default {server: {base: \'/root\'}}',
        'postdoc.conf.cjs': 'module.exports = {server: {port: 5698}}',
        'postdoc.conf.js': 'module.exports = {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      const configuration = await resolveConfiguration();

      strictEqual(configuration.server.base, '/root');
    });

    it('should load CommonJS config if ES module is absent', async function () {
      mockFs({
        'postdoc.conf.cjs': 'module.exports = {server: {port: 5698}}',
        'postdoc.conf.js': 'module.exports = {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      mockConfigurationFilesToLoad();

      const configuration = await resolveConfiguration();

      strictEqual(configuration.server.port, 5698);
    });

    it('should load CommonJS config if package.json does not contain type: module', async function () {
      mockFs({
        'postdoc.conf.js': 'module.exports = {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      mockConfigurationFilesToLoad();

      const configuration = await resolveConfiguration();

      strictEqual(configuration.server.strictPort, true);
    });

    it('should load the config as ES module if package.json contains the type: module', async function () {
      mockFs({
        'postdoc.conf.js': 'export default {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file", "type":"module"}'
      });

      const configuration = await resolveConfiguration();

      strictEqual(configuration.server.strictPort, true);
    });

    it('should load JSON config if no other types are present', async function () {
      mockFs({
        'postdoc.json': '{"server": {"force": true}}',
        'package.json': '{"name":"testing-file"}'
      });

      mockConfigurationFilesToLoad();

      const configuration = await resolveConfiguration();

      strictEqual(configuration.server.force, true);
    });

    afterEach(function () {
      mockFs.restore();
      mockRequire.stopAll();
    });
  });
});
