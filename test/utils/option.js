import { ok, notStrictEqual, strictEqual } from "node:assert";

import { fake } from "sinon";
import { it, describe } from "mocha";

import { identity } from "../../lib/utils/fp.js";
import { isOption, Option, Some, None } from "../../lib/utils/option.js";

describe("Option module", function () {
  describe("Option", function () {
    it("should be a function", function () {
      ok(typeof Option === "function");
    });

    it("should return an object", function () {
      ok(typeof Option() === "object");
    });

    it("should create an Option instance in the Some state", function () {
      ok(Option(7).isSome());
    });

    it("should create an Option instance in the None state", function () {
      ok(Option().isNone());
    });
  });

  describe("Some", function () {
    it("should be same function as Option", function () {
      ok(Some === Option);
    });
  });

  describe("None", function () {
    it("should an object", function () {
      ok(typeof None === "object");
    });
  });

  describe(".map", function () {
    it("should return a new Option instance", function () {
      const result = Some(6);
      const otherResult = result.map((value) => value + 1);

      notStrictEqual(result, otherResult);
    });

    it("should transform Option's value if the state is Some", function () {
      const result = Some(6).map((value) => value + 1);

      strictEqual(
        result.extract(() => 0),
        7,
      );
    });

    it("should not transform Option's value if the state is None", function () {
      const result = None.map((value) => value + 1);

      strictEqual(result.extract(identity), undefined);
    });
  });

  describe(".chain", function () {
    it("should return a new Option instance", function () {
      const result = Some(6);
      const otherResult = result.chain((value) => Some(value + 1));

      notStrictEqual(result, otherResult);
    });

    it("should transform Option's value if the state is Some", function () {
      const result = Some(6).chain((value) => Some(value + 1));

      strictEqual(result.extract(identity), 7);
    });

    it("should not transform Option's value if the state is None", function () {
      const result = None.chain((value) => Some(value + 1));

      strictEqual(result.extract(identity), undefined);
    });

    it("should not cover the Option instance inside another Option", function () {
      const result = Some(6).chain((value) => Some(value + 1));

      ok(!isOption(result.extract(identity)));
    });
  });

  describe(".apply", function () {
    it("should return a new Option instance", function () {
      const result = Some(6);
      const otherResult = result.apply(Some((value) => value + 1));

      notStrictEqual(result, otherResult);
    });

    it("should call the other's Option function over the current one", function () {
      const callback = fake((value) => value + 1);
      const result = Some(6);
      const otherResult = result.apply(Some(callback));

      ok(callback.called);
      strictEqual(
        otherResult.extract(() => 0),
        7,
      );
    });
  });

  describe(".extract", function () {
    it("should unwrap result of the Option monad", function () {
      const result = Some(8);

      strictEqual(result.extract(identity), 8);
    });

    it("should execute the parameter callback if the Option is in the None state", function () {
      const callback = fake(identity);

      strictEqual(None.extract(callback), undefined);
      ok(callback.called);
    });
  });

  describe("isOption", function () {
    it("should detect Option instances", function () {
      ok(isOption(Some(1)));
      ok(!isOption(2));
      ok(!isOption([]));
      ok(!isOption({}));
    });
  });
});
