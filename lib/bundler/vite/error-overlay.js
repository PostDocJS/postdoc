import {inspect} from 'node:util';

/**
 * Creates a simple HTML overlay of the error.
 *
 * @param {number} statusCode
 * @param {string} message
 * @param {Error} [error]
 */
export const createErrorOverlay = (statusCode, message, error) =>
  `<div><h1>${statusCode}</h1><p>${message}</p>${
    error ? `<p>${inspect(error)}</p>` : ''
  }</div>`;
