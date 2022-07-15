const path = require('path');
const {strictEqual} = require('assert');

const {urlFromPath} = require('../../lib/utils/url.js');

describe('url module', function () {
  describe('urlFromPath', function () {
    it('should convert the FS file path to the public URL', function () {
      const filePath = path.join(path.sep, 'about', 'index.html');

      strictEqual(urlFromPath(filePath), '/about/index.html');
    });
  });
});