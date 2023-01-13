const {ok, notStrictEqual, strictEqual} = require('assert');

const {fake} = require('sinon');
const {it, describe} = require('mocha');

const {not, identity} = require('../../lib/utils/fp.js');
const {isResult, Ok, Err, mergeResults, tryExecute} = require('../../lib/utils/result.js');

describe('Result module', function () {
  describe('Ok', function () {
    it('should be a function', function () {
      ok(typeof Ok === 'function');
    });

    it('should return an object', function () {
      ok(typeof Ok() === 'object');
    });

    it('should create a Result instance in the Right state', function () {
      ok(Ok(7).isOk());
    });
  });

  describe('Err', function () {
    it('should be a function', function () {
      ok(typeof Err === 'function');
    });

    it('should return an object', function () {
      ok(typeof Err() === 'object');
    });

    it('should create a Result instance in the Left state', function () {
      ok(Err(7).isErr());
    });
  });

  describe('.map', function () {
    it('should return a new Result instance', function () {
      const result = Ok(6);
      const otherResult = result.map((value) => value + 1);

      notStrictEqual(result, otherResult);
    });

    it('should transform Result\'s value if the state is Right',  function () {
      const result =  Ok(6).map((value) => value + 1);

      strictEqual(result.extract(), 7);
    });

    it('should not transform Result\'s value if the state is Left',  function () {
      const result =  Err(6).map((value) => value + 1);

      strictEqual(result.extract(identity), 6);
    });
  });

  describe('.chain', function () {
    it('should return a new Result instance', function () {
      const result = Ok(6);
      const otherResult = result.chain((value) => Ok(value + 1));

      notStrictEqual(result, otherResult);
    });

    it('should transform Result\'s value if the state is Right',  function () {
      const result =  Ok(6).chain((value) => Ok(value + 1));

      strictEqual(result.extract(identity), 7);
    });

    it('should not transform Result\'s value if the state is Left',  function () {
      const result =  Err(6).chain((value) => Ok(value + 1));

      strictEqual(result.extract(identity), 6);
    });

    it('should not cover the Result instance inside another Result',  function () {
      const result =  Ok(6).chain((value) => Ok(value + 1));

      ok(!isResult(result.extract(identity)));
    });
  });

  describe('.apply', function () {
    it('should return a new Result instance', function () {
      const result = Ok(6);
      const otherResult = result.apply(
        Ok((value) => value + 1)
      );

      notStrictEqual(result, otherResult);
    });

    it('should call the other\'s Result function over the current one', function () {
      const callback = fake((value) => value + 1);
      const result = Ok(6);
      const otherResult =  result.apply(Ok(callback));

      ok(callback.called);
      strictEqual(otherResult.extract(() => 0), 7);
    });
  });

  describe('.extract', function () {
    it('should unwrap result of the Result monad', function () {
      const result = Ok(8);

      strictEqual(result.extract(identity), 8);
    });

    it('should execute the parameter callback if the Result is in the Left state',  function () {
      const callback = fake(identity);
      const result = Err('error');

      strictEqual(result.extract(callback), 'error');
      ok(callback.called);
    });
  });

  describe('isResult', function () {
    it('should detect Result instances', function () {
      ok(isResult(Ok(1)));
      ok(!isResult(2));
      ok(!isResult([]));
      ok(!isResult({}));
    });
  });

  describe('mergeResults', function () {
    it('should merge an array of Results into the Result with an array of values', function () {
      const result =  mergeResults([Ok(1), Ok(2), Ok(3)]);

      ok(Array.isArray(result.extract(() => null)));
      ok(result.extract(() => null).every(not(isResult)));
    });

    it('should return the first failed value', function () {
      const result = mergeResults([Ok(1), Err(2), Ok(3)]);

      ok(result.isErr());
      strictEqual(result.extract(identity), 2);
    });
  });

  describe('tryExecute', function () {
    it('should execute the function and return the result object', function () {
      const fn = () => 5;

      const result = tryExecute(fn);

      ok(isResult(result));
      strictEqual(result.extract(() => 0), 5);
    });

    it('should return the Result in the error state if the parameter throws', function () {
      const fn = () => {
        throw 1;
      };

      const callback = fake(() => 2);

      const result = tryExecute(fn);
      const extractedValue = result.extract(callback);

      ok(isResult(result));
      strictEqual(extractedValue, 2);
      strictEqual(callback.firstCall.firstArg, 1); 
    });
  });
});
