import {fake} from 'sinon';
import {timestamp, Duration} from '../../lib/utils/date.js';

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

describe('date module', function () {
  describe('timestamp', function () {
    it('should return the string value', function (client) {
      client.assert.ok(typeof timestamp() === 'string');
    });

    it('should return the string in the "day month hours:minutes:seconds" format', function (client) {
      client.assert.ok(
        /\d{1,2}\s[a-zA-Z]{3}\s\d{2}:\d{2}:\d{2}/.test(timestamp())
      );
    });
  });

  describe('Duration', function () {
    it('should be a function', function (client) {
      client.assert.ok(typeof Duration === 'function');
    });

    it('should return an object', function (client) {
      client.assert.ok(typeof Duration() === 'object');
    });

    it('should convert itself to the Date object', function (client) {
      client.assert.ok(Duration().toDate() instanceof Date);
    });

    it('should be able to transform itself and return the new Duration object', function (client) {
      const map = fake((date) => new Date(date - date));

      const duration = Duration();
      const newDuration = duration.map(map);

      client.assert.deepStrictEqual(map.firstArg, duration.toDate());
      client.assert.notStrictEqual(duration, newDuration);
      client.assert.deepStrictEqual(newDuration.toDate(), new Date(0));
    });

    it('should accept the number or the Date as the first and the second arguments', function (client) {
      client.assert.deepStrictEqual(Duration(0, 1).toDate(), new Date(1));
      client.assert.deepStrictEqual(
        Duration(new Date(0), new Date(1)).toDate(),
        new Date(1)
      );
    });

    it('should be able to change the start duration point with the Date or the number value', function (client) {
      const duration = Duration(0, 2).from(1);
      const durationOther = Duration(0, 6).from(new Date(3));

      client.assert.deepStrictEqual(duration.toDate(), new Date(1));
      client.assert.deepStrictEqual(durationOther.toDate(), new Date(3));
    });

    it('should be able to change the end duration point with the Date or the number value', function (client) {
      const duration = Duration(0, 0).until(1);
      const durationOther = Duration(0, 0).until(new Date(3));

      client.assert.deepStrictEqual(duration.toDate(), new Date(1));
      client.assert.deepStrictEqual(durationOther.toDate(), new Date(3));
    });

    it('should be able to set the end of the Duration object at now', async function (client) {
      const duration = Duration();

      await sleep(10);

      client.assert.ok(duration.untilNow().toDate().getTime() > 0);
    });
  });
});
