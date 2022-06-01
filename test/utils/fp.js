const {strictEqual} = require('assert');

const {it, describe} = require('mocha');

const {identity} = require('../../lib/utils/fp.js');

describe('fp', function () {
  describe('identity', function () {
    it('should return the parameter unchanged', function () {
      const result = identity(5);

      const object = {};
      const result1 = identity(object);

      strictEqual(result, 5);
      strictEqual(object, result1);
    });
  });
});
