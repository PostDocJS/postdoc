/**
 * @file Contains useful cryptographically
 * safe random functions.
 *
 * @module safe_crypto
 */

import {randomBytes} from 'node:crypto';

/**
 * Generates a cryptographically safe unique id.
 *
 * @param {number} [length] - length of the identifier.
 */
export const uid = (length = 5) => randomBytes(length).toString('hex');
