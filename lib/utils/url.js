/**
 * @file Contains function to work with the URL entity.
 *
 * @module url
 */

const path = require('path');

const {URL_DELIMITER} = require('../../lib/constants.js');

/**
 * Replaces the OS path delimiter with the `/`.
 *
 * @param {string} filePath
 */
const withURLSeparator = (filePath) =>
  filePath.replace(
    new RegExp(`\\${path.sep}`, 'g'),
    URL_DELIMITER
  );

exports.withURLSeparator = withURLSeparator;
