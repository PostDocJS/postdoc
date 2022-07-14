/**
 * @file Contains entities that allow code in functional style.
 *
 * @module fp
 */

/**
 * Returns the parameter unchanged.
 *
 * @template {T}
 * @param {T} any
 * @returns {T}
 */
const identity = (any) => any;

/**
 * Inverts the result of the *fn*.
 *
 * @template {(...param: readonly unknown[]) => unknown} Fn
 * @param {Fn} fn
 * @returns {(...params: Parameters<Fn>) => boolean}
 */
const not =
  (fn) =>
    (...args) =>
      !fn(...args);

/**
 * Checks whether the *value* is object.
 *
 * @param {unknown} value
 */
const isObject = (value) => value !== null && typeof value === 'object';

/**
 * Panics with a message.
 * Errors thrown by this function shouldn't be catched.
 *
 * @param {string} message
 */
const panic = (message) => {
  throw new Error(message);
};

exports.not = not;
exports.panic = panic;
exports.identity = identity;
exports.isObject = isObject;
