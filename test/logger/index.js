const {ok, strictEqual} = require('assert');

const {it, describe} = require('mocha');

const {LineBuilder} = require('../../lib/logger/index.js');

describe('Logger module', function () {
  describe('LineBuilder', function () {
    it('should be a function', function () {
      ok(typeof LineBuilder === 'function');
    });

    it('should create an object', function () {
      ok(typeof LineBuilder() === 'object');
    });

    describe('.build', function () {
      it('should return an empty string if no builder methods were called', function () {
        strictEqual(LineBuilder().build(), '');
      });

      it('should return a defined string when at least one builder method was called', function () {
        strictEqual(LineBuilder().text('text').build(), 'text');
      });
    });

    describe('.text', function () {
      it('should accept value that will be a part of the line and return the same builder instance', function () {
        const builder = LineBuilder();

        strictEqual(builder.text('hello'), builder);

        strictEqual(builder.build(), 'hello');
      });

      it('should save the value as is', function () {
        const line = LineBuilder().text('hello').text(' world').build();

        strictEqual(line, 'hello world');
      });
    });
  });
});
