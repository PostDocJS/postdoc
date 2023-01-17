/**
 * @file Contains function to work with the URL entity.
 *
 * @module url
 */

import {sep} from 'node:path';

import {URL_DELIMITER} from '../../lib/constants.js';

/**
 * Replaces the OS path delimiter with the `/`.
 *
 * @param {string} filePath
 */
export const withURLSeparator = (filePath) =>
  filePath.replace(
    new RegExp(`\\${sep}`, 'g'),
    URL_DELIMITER
  );
