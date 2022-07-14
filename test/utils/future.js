const {isPromise} = require('util/types');
const {ok, doesNotReject, notStrictEqual, strictEqual} = require('assert');

const {fake} = require('sinon');
const {it, describe} = require('mocha');

const {identity} = require('../../lib/utils/fp.js');
const {isResult} = require('../../lib/utils/result.js');
const {Future, isFuture, Succeed, Fail, mergeFutures} = require('../../lib/utils/future.js');

describe('Future module', function () {
  describe('Future', function () {
    it('should be a function', function () {
      ok(typeof Future === 'function');
    });

    it('should return an object', function () {
      ok(typeof Future() === 'object');
    });

    it('should accept an executor function as the argument', async function () {
      const future = Future((success, _fail) => success());

      await doesNotReject(() => future.run());
    });

    it('should accept a Promise as the argument', async function () {
      const future = Future(Promise.resolve());

      await doesNotReject(() => future.run());
    });

    it('should accept another Future as the argument', async function () {
      const future = Future(Future((success, _fail) => success()));

      await doesNotReject(() => future.run());
    });

    it('should not execute a parameter immediately', function () {
      const executor = fake((success, _fail) => success());

      Future(executor);

      ok(!executor.called);
    });

    describe('.run', function () {
      it('should execute a Future and return the Result monad', async function () {
        const executor = fake((success, fail) => Math.random() > 0.45 ? success() : fail());
        const future = Future(executor);

        const result = future.run();

        ok(isPromise(result));
        ok(isResult(await result));
        ok(executor.called);
      });

      it('should not return rejected Promise if the Future fails', async function () {
        const future = Future((_, fail) => fail());

        await doesNotReject(() => future.run());
      });
    });

    describe('.map', function () {
      it('should not invoke a callback immediately', function () {
        const callback = fake((value) => value + 1);

        Future((success, _fail) => success(6))
          .map(callback);

        ok(!callback.called);
      });

      it('should return a new Future instance', function () {
        const future = Future((success, _fail) => success(6));
        const otherFuture = future.map((value) => value + 1);

        notStrictEqual(future, otherFuture);
      });

      it('should transform Future\'s value', async function () {
        const result = await Future((success, _fail) => success(6))
          .map((value) => value + 1)
          .run();

        strictEqual(result.extract(() => 0), 7);
      });
    });

    describe('.chain', function () {
      it('should not invoke a callback immediately', function () {
        const callback = fake((value) => Future((success, _fail) => success(value + 1)));

        Future((success, _fail) => success(6)).chain(callback);

        ok(!callback.called);
      });

      it('should return a new Future instance', function () {
        const future = Future((success, _fail) => success(6));
        const otherFuture = future.chain(
          (value) => Future((success, _fail) => success(value + 1))
        );

        notStrictEqual(future, otherFuture);
      });

      it('should not cover the Future instance inside another Future', async function () {
        const result = await Future((success, _fail) => success(6))
          .chain((value) => Future((success, _fail) => success(value + 1)))
          .run();

        ok(isResult(result));
      });

      it('should transform Future\'s value', async function () {
        const result = await Future((success, _fail) => success(6))
          .chain((value) => Future((success, _fail) => success(value + 1)))
          .run();

        strictEqual(result.extract(() => 0), 7);
      });
    });

    describe('.apply', function () {
      it('should not invoke a callback immediately', function () {
        const callback = fake((value) => value + 1);

        const other = Future((success, _fail) => success(fn));

        Future((success, _fail) => success(6)).apply(other);

        ok(!callback.called);
      });

      it('should return a new Future instance', function () {
        const future = Future((success, _fail) => success(6));
        const otherFuture = future.apply(
          Future((success, _fail) => success((value) => value + 1))
        );

        notStrictEqual(future, otherFuture);
      });

      it('should call the other\'s Future function over the result of the current one', async function () {
        const callback = fake((value) => value + 1);
        const future = Future((success, _fail) => success(6));
        const result = await future
          .apply(Future((success, _fail) => success(callback)))
          .run();

        ok(callback.called);
        strictEqual(result.extract(() => 0), 7);
      });
    });
  });

  describe('Succeed', function () {
    it('should create a succeeded Feature with a value', async function () {
      const fn = (success, _fail) => success();
      const future = Succeed(fn);

      strictEqual((await future.run()).extract(() => null), fn);
    });
  });

  describe('Fail', function () {
    it('should create a failed Feature with a value', async function () {
      const fn = (success, _fail) => success();
      const future = Fail(fn);

      const getDefaultValue = fake(() => null);

      strictEqual((await future.run()).extract(getDefaultValue), null);
      ok(getDefaultValue.called);
      strictEqual(getDefaultValue.firstArg, fn);
    });
  });

  describe('isFuture', function () {
    it('should detect Future instances', function () {
      ok(isFuture(Future((success, _fail) => success())));
      ok(!isFuture(2));
      ok(!isFuture([]));
      ok(!isFuture({}));
    });
  });

  describe('mergeFutures', function () {
    it('should merge an array of Futures into the Future with an array of results', async function () {
      const result = await mergeFutures([Succeed(1), Succeed(2), Succeed(3)]).run();
      
      ok(Array.isArray(result.extract(() => null)));
      ok(result.extract(() => null).every(isResult));
    });

    it('should return all results even if there are failed ones', async function () {
      const result = await mergeFutures([Succeed(1), Fail(2), Succeed(3)]).run();

      ok(result.isOk());
      ok(Array.isArray(result.extract(identity)));
      strictEqual(result.extract(identity)[1].extract(identity), 2);
    });
  });
});