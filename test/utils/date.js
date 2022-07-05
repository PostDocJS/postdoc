const {ok, notStrictEqual, deepStrictEqual} = require('assert');

const {fake} = require('sinon');
const {it, describe} = require('mocha');

const {timestamp, Duration} = require('../../lib/utils/date.js');

describe('date module', function () {
  describe('timestamp', function () {
    it('should return the string value', function () {
      ok(typeof timestamp() === 'string');
    });

    it('should return the string in the "day month hours:minutes:seconds" format', function () {
      ok(/\d{1,2}\s[a-zA-Z]{3}\s\d{2}:\d{2}:\d{2}/.test(timestamp()));
    });
  });

  describe('Duration', function () {
    it('should be a function', function () {
      ok(typeof Duration === 'function');
    });

    it('should return an object', function () {
      ok(typeof Duration() === 'object');
    });

    it('should convert itself to the Date object', function () {
      ok(Duration().toDate() instanceof Date);
    });

    it('should be able to transform itself and return the new Duration object', function () {
      const map = fake((date) => new Date(date - date));

      const duration = Duration();
      const newDuration = duration.map(map);

      deepStrictEqual(map.firstArg, duration.toDate());
      notStrictEqual(duration, newDuration);
      deepStrictEqual(newDuration.toDate(), new Date(0));
    });

    it('should accept the number or the Date as the first and the second arguments', function () {
      deepStrictEqual(Duration(0, 1).toDate(), new Date(1));
      deepStrictEqual(Duration(new Date(0), new Date(1)).toDate(), new Date(1));
    });

    it('should be able to change the start duration point with the Date or the number value', function () {
      const duration = Duration(0, 2).from(1);
      const durationOther = Duration(0, 6).from(new Date(3));

      deepStrictEqual(duration.toDate(), new Date(1));
      deepStrictEqual(durationOther.toDate(), new Date(3));
    });

    it('should be able to change the end duration point with the Date or the number value', function () {
      const duration = Duration(0, 0).until(1);
      const durationOther = Duration(0, 0).until(new Date(3));

      deepStrictEqual(duration.toDate(), new Date(1));
      deepStrictEqual(durationOther.toDate(), new Date(3));
    });

    it('should be able to set the end of the Duration object at now', function () {
      const duration = Duration();

      ok(duration.untilNow().toDate().getTime() > 0);
    });
  });
});
