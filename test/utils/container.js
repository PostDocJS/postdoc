const {ok, throws, doesNotThrow, strictEqual} = require('assert');

const {it, describe} = require('mocha');

const {Container} = require('../../lib/utils/container.js');

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