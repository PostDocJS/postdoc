import {ok, throws, doesNotThrow, strictEqual} from 'node:assert';

import {it, describe} from 'mocha';

import {Container} from '../../lib/utils/container.js';

describe('Container', function () {
  it('should be an object', function () {
    ok(typeof Container === 'object');
  });

  it('should throw before defining the key', function () {
    throws(() => Container.get(Symbol()));
  });

  it('should return a value for a knowing key', function () {
    const key = Symbol();

    Container.set(key, 'foo');

    doesNotThrow(() => Container.get(key));
    strictEqual(Container.get(key), 'foo');
  });

  it('should remove a value by a key', function () {
    const key = Symbol();

    Container.set(key, 'foo');
    Container.remove(key);

    throws(() => Container.get(key));
  });
});
