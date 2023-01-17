import {ok} from 'node:assert';

import {fake} from 'sinon';
import {it, describe} from 'mocha';

import {identity} from '../../lib/utils/fp.js';
import {Stream, isStream} from '../../lib/utils/stream.js';

describe('Stream', function () {
  it('should be a function', function () {
    ok(typeof Stream === 'function');
  });

  it('should return an object', function () {
    ok(typeof Stream() === 'object');
  });

  describe('.forEach', function () {
    it('should not execute a parameter immediately', function () {
      const callback = fake();

      Stream().forEach(callback);

      ok(!callback.called);
    });

    it('should return the function', function () {
      const callback = Stream().forEach(() => {});

      ok(typeof callback === 'function');
    });
  });

  describe('.send', function () {
    it('should execute the callback passed to the forEach method', function () {
      const callback = fake();
      const stream = Stream(identity);
      stream.forEach(callback);

      stream.send(1);

      ok(callback.calledOnce);
      ok(callback.calledWith(1));
    });
  });

  it('should pass values as is if no function is provided', function () {
    const callback = fake();
    const stream = Stream();
    stream.forEach(callback);

    stream.send(1);

    ok(callback.calledOnce);
    ok(callback.calledWith(1));
  });

  it('should be able to compose passed function that transforms the value in the Stream', function () {
    const callback = fake();
    const stream = Stream(
      (number) => number + 1
    );
    stream.forEach(callback);

    stream.send(1);

    ok(callback.calledOnce);
    ok(callback.calledWith(2));
  });

  it('should not execute the listener if the value is undefined', function () {
    const callback = fake();
    const stream = Stream(
      (number) => number + 1
    );
    stream.forEach(callback);

    stream.send(undefined);

    ok(!callback.called);
  });

  it('should not execute the listener if the transform function returns undefined', function () {
    const callback = fake();
    const map = fake((number) => number + 1);

    const stream = Stream(
      (_number) => undefined,
      map
    );
    stream.forEach(callback);

    stream.send(1);

    ok(!callback.called);
    ok(!map.called);
  });

  it('should not execute the listener if it is detached', function () {
    const callback = fake();

    const stream = Stream();
    const detach = stream.forEach(callback);

    detach();

    stream.send(1);

    ok(!callback.called);
  });

  describe('isStream', function () {
    it('should return true if the value is the Stream', function () {
      ok(isStream(Stream()));
    });

    it('should return false if the value is not the Stream', function () {
      ok(!isStream(1));
      ok(!isStream(''));
      ok(!isStream([]));
    });
  });
});
