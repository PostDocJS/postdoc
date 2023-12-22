import { join } from 'node:path';
import { chdir } from 'node:process';
import { tmpdir } from 'node:os';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';

import Configuration from '../../lib/configuration.js';

describe('Configuration module', function () {
  let tmpDir;
  beforeEach(async function (_client, done) {
    tmpDir = await mkdtemp(join(tmpdir(), 'test-doc'));
    chdir(tmpDir);
    done();
  });

  afterEach(async function (_client, done) {
    await rm(tmpDir, { recursive: true });
    done();
  });

  describe('files priority', function () {
    it('should load the ES module config file at first', async function (client) {
      await writeFile(
        'postdoc.config.mjs',
        'export default {appSettings: {base: \'/root1\'}}',
        'utf-8'
      );
      await writeFile(
        'postdoc.config.cjs',
        'module.exports = {appSettings: {base: \'/root2\'}}',
        'utf-8'
      );
      await writeFile(
        'postdoc.config.js',
        'module.exports = {appSettings: {base: \'/root3\'}}',
        'utf-8'
      );
      await writeFile(
        'postdoc.config.json',
        '{"appSettings": {"base": "/root4"}}',
        'utf-8'
      );
      await writeFile('package.json', '{"name":"testing-file"}', 'utf-8');

      await Configuration.initialise({});

      const configuration = Configuration.get();

      client.assert.equal(configuration.appSettings.base, '/root1');
    });

    it('should load CommonJS config if ES module is absent', async function (client) {
      await writeFile(
        'postdoc.config.cjs',
        'module.exports = {appSettings: {base: \'/root2\'}}',
        'utf-8'
      );
      await writeFile(
        'postdoc.config.js',
        'module.exports = {appSettings: {base: \'/root3\'}}',
        'utf-8'
      );
      await writeFile(
        'postdoc.config.json',
        '{"appSettings": {"base": "/root4"}}',
        'utf-8'
      );
      await writeFile('package.json', '{"name":"testing-file"}', 'utf-8');

      await Configuration.initialise({});

      const configuration = Configuration.get();

      client.assert.equal(configuration.appSettings.base, '/root2');
    });

    it('should load CommonJS config if package.json does not contain type: module', async function (client) {
      await writeFile(
        'postdoc.config.js',
        'module.exports = {appSettings: {base: \'/root3\'}}',
        'utf-8'
      );
      await writeFile(
        'postdoc.config.json',
        '{"appSettings": {"base": "/root4"}}',
        'utf-8'
      );
      await writeFile('package.json', '{"name":"testing-file"}', 'utf-8');

      await Configuration.initialise({});

      const configuration = Configuration.get();

      client.assert.equal(configuration.appSettings.base, '/root3');
    });

    it('should load the config as ES module if package.json contains the type: module', async function (client) {
      await writeFile(
        'postdoc.config.js',
        'export default {appSettings: {base: \'/root3\'}}',
        'utf-8'
      );
      await writeFile(
        'postdoc.config.json',
        '{"appSettings": {"base": "/root4"}}',
        'utf-8'
      );
      await writeFile(
        'package.json',
        '{"name":"testing-file", "type": "module"}',
        'utf-8'
      );

      await Configuration.initialise({});

      const configuration = Configuration.get();

      client.assert.equal(configuration.appSettings.base, '/root3');
    });

    it('should load JSON config if no other types are present', async function (client) {
      await writeFile(
        'postdoc.config.json',
        '{"appSettings": {"base": "/root4"}}',
        'utf-8'
      );
      await writeFile(
        'package.json',
        '{"name":"testing-file", "type": "module"}',
        'utf-8'
      );

      await Configuration.initialise({});

      const configuration = Configuration.get();

      client.assert.equal(configuration.appSettings.base, '/root4');
    });
  });

  describe('Injecting environment variables', function () {
    it('should replace the interpolation pattern with an environment variable with the pattern as the name', async function (client) {
      await writeFile(
        'postdoc.config.js',
        'export default {appSettings: {base: "${PROP_ENV}"}}',
        'utf-8'
      );
      await writeFile('package.json', '{"type":"module"}', 'utf-8');

      await Configuration.initialise({
        PROP_ENV: 'secret root'
      });

      const configuration = Configuration.get();

      client.assert.equal(configuration.appSettings.base, 'secret root');
    });
  });
});
