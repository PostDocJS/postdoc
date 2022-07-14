const {strictEqual, ok, throws} = require('assert');

const {it, describe} = require('mocha');

const {identity, not, isObject, panic} = require('../../lib/utils/fp.js');

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
    it('should return the inverse result of the parameter function', function () {
      const fn = not(() => false);

      ok(fn());
    });

    it('should inverse the non-boolean values', function () {
      const fn = not(() => 7);

      ok(!fn());
    });
  });

  describe('isObject', function () {
    it('should return true for object literal, array and class instance', function () {
      ok(isObject({}));
      ok(isObject([]));
      ok(isObject(new Error('')));
    });

    it('should return false for non-object values', function () {
      ok(!isObject(1));
      ok(!isObject(''));
      ok(!isObject(false));
      ok(!isObject(null));
      ok(!isObject(undefined));
      ok(!isObject(Symbol()));
      ok(!isObject(4n));
    });
  });

  describe('panic', function () {
    it('should throw', function () {
      throws(() => panic(''));
    });

    it('should throw with a message', function () {
      throws(() => panic('Panic message'), /Panic message/);
    });
  });
});
