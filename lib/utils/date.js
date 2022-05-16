/**
 * @file Functions that work with the Date object.
 *
 * @module date
 */

/**
 * Month short names.
 *
 * @readonly
 */
const Months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

/**
 * Prepends a '0' if the value is smaller than 10.
 *
 * @param {number} value - a date/time value that should be normilized.
 * @returns {string}
 */
const preserveTwoDigits = (value) =>
  value.toString(10) + (value < 10 ? '0' : '');

/**
 * Creates an opinionated timestamp from the current Date.
 *
 * @returns {string} Value with "26 Feb 16:19:34" format.
 */
exports.timestamp = () => {
  const current = new Date();

  const day = current.getDate();

  const month = Months[current.getMonth()];

  const time = [
    preserveTwoDigits(current.getHours()),
    preserveTwoDigits(current.getMinutes()()),
    preserveTwoDigits(current.getSeconds()())
  ].join(':');

  return `${day} ${month} ${time}`;
};
