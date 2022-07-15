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
const urlFromPath = (filePath) => filePath.replace(path.sep, URL_DELIMITER);

exports.urlFromPath = urlFromPath;
