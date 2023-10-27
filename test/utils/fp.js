import {
  strictEqual,
  ok,
  throws,
  deepStrictEqual,
  notStrictEqual,
} from "node:assert";

import { fake } from "sinon";
import { it, describe } from "mocha";

import {
  not,
  tap,
  pipe,
  memo,
  panic,
  compose,
  toArray,
  identity,
  isObject,
  isNothing,
} from "../../lib/utils/fp.js";

describe("fp module", function () {
  describe("identity", function () {
    it("should return the parameter unchanged", function () {
      const result = identity(5);

      const object = {};
      const result1 = identity(object);

      strictEqual(result, 5);
      strictEqual(object, result1);
    });
  });

  describe("not", function () {
    it("should return the inverse result of the parameter function", function () {
      const fn = not(() => false);

      ok(fn());
    });

    it("should inverse the non-boolean values", function () {
      const fn = not(() => 7);

      ok(!fn());
    });
  });

  describe("isObject", function () {
    it("should return true for object literal, array and class instance", function () {
      ok(isObject({}));
      ok(isObject([]));
      ok(isObject(new Error("")));
    });

    it("should return false for non-object values", function () {
      ok(!isObject(1));
      ok(!isObject(""));
      ok(!isObject(false));
      ok(!isObject(null));
      ok(!isObject(undefined));
      ok(!isObject(Symbol()));
      ok(!isObject(4n));
    });
  });

  describe("panic", function () {
    it("should throw", function () {
      throws(() => panic(""));
    });

    it("should throw with a message", function () {
      throws(() => panic("Panic message"), /Panic message/);
    });
  });

  describe("isNothing", function () {
    it("should return true if the argument is null or undefined", function () {
      ok(isNothing(null));
      ok(isNothing(undefined));
      ok(!isNothing(0));
      ok(!isNothing(""));
      ok(!isNothing(NaN));
    });
  });

  describe("toArray", function () {
    it("should return the argument untouched if it is an array", function () {
      const array = [];

      strictEqual(toArray(array), array);
    });

    it("should convert an iterable into the array", function () {
      const iterable = new Set([1, 2, 3]);

      deepStrictEqual(toArray(iterable), [1, 2, 3]);
    });

    it("should wrap non-array value into an array", function () {
      deepStrictEqual(toArray(1), [1]);
    });
  });

  describe("pipe", function () {
    it("should execute functions sequentially and pass result of one as an argument of the next function", function () {
      const a = fake((a) => a);
      const b = fake((b) => String(b));
      const c = fake((c) => c + "!");

      const s = pipe(a, b, c);

      ok(a.notCalled);
      ok(b.notCalled);
      ok(c.notCalled);

      const result = s(1);

      strictEqual(result, "1!");
      ok(a.calledWith(1));
      ok(b.calledWith(1));
      ok(c.calledWith("1"));
    });
  });

  describe("compose", function () {
    it("should execute function from right to left and pass the result the previous one to the next", function () {
      const c = fake((c) => c + "!");
      const b = fake((b) => String(b));
      const a = fake((a) => a);

      const s = compose(c, b, a);

      ok(a.notCalled);
      ok(b.notCalled);
      ok(c.notCalled);

      const result = s(1);

      strictEqual(result, "1!");
      ok(a.calledWith(1));
      ok(b.calledWith(1));
      ok(c.calledWith("1"));
    });
  });

  describe("memo", function () {
    it("should produce a new function", function () {
      const fn = () => {};

      notStrictEqual(memo(fn), fn);
    });

    it("should return the same result as the original function", function () {
      const fn = (a) => a === 3;

      const memoFn = memo(fn);

      strictEqual(fn(1), memoFn(1));
    });

    it("should not call the function if it is called with the same argument", function () {
      const fn = fake(String);

      const memoFn = memo(fn);

      const a = memoFn(1);
      const b = memoFn(1);
      const c = memoFn(1);

      ok(fn.calledOnce);
      strictEqual(a, "1");
      strictEqual(b, "1");
      strictEqual(c, "1");
    });

    it("memoised function should expose the cache object", function () {
      const fn = memo(fake());

      ok(fn.cache);
    });

    it("exposed cache object should be readonly", function () {
      const callback = fake(String);
      const fn = memo(callback);

      const first = fn(1);
      fn(2);

      fn.cache = new Map();

      const second = fn(1);

      ok(callback.calledTwice);
      strictEqual(first, second);
    });

    it("should use keyFrom parameter to get unique key", function () {
      const keyFrom = fake(String);

      const memoFn = memo(identity, keyFrom);

      memoFn(1);
      memoFn(2);

      ok(keyFrom.calledTwice);
      strictEqual(keyFrom.firstCall.returnValue, "1");
      strictEqual(keyFrom.secondCall.returnValue, "2");
    });
  });

  describe("tap", function () {
    it("should return a new function", function () {
      const fn = () => {};

      notStrictEqual(tap(fn), fn);
    });

    it("should ignore the result of the parameter and return the argument as is", function () {
      const toString = fake(String);
      const fn = tap(toString);

      const result = fn(1);

      ok(toString.calledOnce);
      strictEqual(result, 1);
      strictEqual(toString.firstCall.returnValue, "1");
    });
  });
});
