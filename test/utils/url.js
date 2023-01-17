import {join, sep} from 'node:path';
import {strictEqual} from 'node:assert';

import {withURLSeparator} from '../../lib/utils/url.js';

describe('url module', function () {
  describe('withURLSeparator', function () {
    it('should convert the FS file path to the public URL', function () {
      const filePath = join(sep, 'about', 'index.html');

      strictEqual(withURLSeparator(filePath), '/about/index.html');
    });
  });
});
