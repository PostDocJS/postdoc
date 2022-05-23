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

exports.identity = identity;
