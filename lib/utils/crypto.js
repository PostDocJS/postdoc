/**
 * @file Contains useful cryptographically
 * safe random functions.
 *
 * @module safe_crypto
 */

const crypto = require('crypto');

/** Generates cryptographically safe unique id. */
exports.uid = () => crypto.randomBytes(5).toString('hex');
