const path = require('path');
const {strictEqual} = require('assert');

const {withURLSeparator} = require('../../lib/utils/url.js');

describe('url module', function () {
  describe('withURLSeparator', function () {
    it('should convert the FS file path to the public URL', function () {
      const filePath = path.join(path.sep, 'about', 'index.html');

      strictEqual(withURLSeparator(filePath), '/about/index.html');
    });
  });
});