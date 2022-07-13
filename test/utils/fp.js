const {strictEqual, ok} = require('assert');

const {it, describe} = require('mocha');

const {identity, not} = require('../../lib/utils/fp.js');

describe('fp module', function () {
  describe('identity', function () {
    it('should return the parameter unchanged', function () {
      const result = identity(5);

      const object = {};
      const result1 = identity(object);

      strictEqual(result, 5);
      strictEqual(object, result1);
    });
  });

  describe('not', function () {
    it('should return the inversed result of the parameter function', function () {
      const fn = not(() => false);

      ok(fn());
    });

    it('should inverse the non-boolean values', function () {
      const fn = not(() => 7);

      ok(!fn());
    });
  });
});
