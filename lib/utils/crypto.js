/**
 * @file Contains useful cryptographically
 * safe random functions.
 *
 * @module safe_crypto
 */

const crypto = require('crypto');

/**
 * Generates cryptographically safe unique id.
 *
 * @param {number} [length=5] - length of the identifier.
 */
exports.uid = (length = 5) => crypto.randomBytes(length).toString('hex');
