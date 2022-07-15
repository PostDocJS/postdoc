const {isPromise} = require('util').types;
const {ok, strictEqual, rejects, doesNotReject} = require('assert');

const {Resolve, Reject} = require('../../lib/utils/promise.js');

describe('Promise module', function () {
  describe('Resolve', function () {
    it('should return a Promise', function () {
      ok(isPromise(Resolve(1)));
    });

    it('should return a resolved Promise', async function () {
      await doesNotReject(() => Resolve(3));
      strictEqual(await Resolve(3), 3);
    });
  });

  describe('Reject', function () {
    it('should return a rejected Promise', async function () {
      await rejects(() => Reject(7), (value) => value === 7);
    });
  });
});
