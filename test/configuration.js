const {strictEqual} = require('assert');

const mock = require('mock-fs');
const {it, before, after, describe} = require('mocha');

const {resolveConfig} = require('../lib/configuration/resolve.js');

describe('Configuration module', function () {
  describe('files priority', function () {
    before(function () {
      mock({
        'postdoc.conf.mjs': 'export default {server: {base: \'/root\'}}',
        'postdoc.conf.cjs': 'module.exports = {server: {port: 5698}}',
        'postdoc.conf.js': 'module.exports = {server: {strictPort: true}}',
        'postdoc.json': '{"server": {"force": true}}'
      });
    });

    it('should load the ES module config file at first', async function () {
      const configuration = await resolveConfig();

      strictEqual(configuration.server.base, '/root');
    });

    after(function () {
      mock.restore();
    });
  });
});