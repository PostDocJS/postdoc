/**
 * @file Functions that work with the Date object.
 *
 * @module date
 */

import {performance} from 'node:perf_hooks';

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
export const timestamp = () => {
  const current = new Date();

  const day = current.getDate();

  const month = Months[current.getMonth()];

  const time = [
    preserveTwoDigits(current.getHours()),
    preserveTwoDigits(current.getMinutes()),
    preserveTwoDigits(current.getSeconds())
  ].join(':');

  return `${day} ${month} ${time}`;
};

/**
 * @callback DurationTransformer
 * @param {Date} duration
 * @returns {Date}
 */

/**
 * Describes a time length between two dates.
 *
 * @param {number|Date} start - Pass a Date object or milliseconds variant.
 * @param {number|Date} end - Pass a Date object or milliseconds variant.
 */
export const Duration = (start = performance.now(), end = performance.now()) => {
  const calculate = () => new Date(end - start);

  const API = {
    /**
     * Transforms the current duration and returns a new one.
     *
     * @param {DurationTransformer} fn
     */
    map: (fn) =>
      Duration(start, new Date(start).getTime() + fn(calculate()).getTime()),
    /**
     * Changes the start date of the Duration.
     *
     * @param {number|Date} date
     */
    from: (date) => ((start = date), API),
    /**
     * Changes the end date of the Duration.
     *
     * @param {number|Date} date
     */
    until: (date) => ((end = date), API),
    /** Make the Duration last until the method invocation. */
    untilNow: () => ((end = performance.now()), API),
    /** Converts the current Duration object to the Date. */
    toDate: calculate
  };

  return API;
};
