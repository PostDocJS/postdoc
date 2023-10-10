import {join, sep} from 'node:path';
import {strictEqual} from 'node:assert';

import {withURLSeparator} from '../../lib/utils/url.js';

describe('url module', function () {
  describe('withURLSeparator', function () {
    it('should convert the FS file path to the public URL', function () {
      const filePath = join('about', 'index.html');

      strictEqual(withURLSeparator(filePath), 'about/index.html');
    });

    it('should return the url as is if the leading property is not set', function () {
      const filePath = join(sep, 'about', 'index.html');

      strictEqual(withURLSeparator(filePath), '/about/index.html');
    });

    it('should prepend a leading slash if the leadingSlash property is true', function () {
      const filePath = join('about', 'index.html');

      strictEqual(
        withURLSeparator(filePath, {leadingSlash: true}),
        '/about/index.html'
      );
    });

    it('should not prepend a leading slash if the leadingSlash property is true and a path contains a leading fs separator', function () {
      const filePath = join(sep, 'about', 'index.html');

      strictEqual(
        withURLSeparator(filePath, {leadingSlash: true}),
        '/about/index.html'
      );
    });

    it('should remove a leading slash if the leadingSlash property is false and a path contains a leading fs separator', function () {
      const filePath = join(sep, 'about', 'index.html');

      strictEqual(
        withURLSeparator(filePath, {leadingSlash: false}),
        'about/index.html'
      );
    });

    it('should not remove a first character if the leadingSlash property is false and a path does not contain a leading fs separator', function () {
      const filePath = join('about', 'index.html');

      strictEqual(
        withURLSeparator(filePath, {leadingSlash: false}),
        'about/index.html'
      );
    });
  });
});
