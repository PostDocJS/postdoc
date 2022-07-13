/**
 * @file Contains function to work with the URL entity.
 *
 * @module url
 */

const path = require('path');

const {URL_DELIMITER} = require('../../lib/constants.js');

/**
 * Converts the FS path to the public URL.
 *
 * @param {string} filePath
 */
const pathToAbsoluteURL = (filePath) => filePath.replace(path.sep, URL_DELIMITER);

exports.pathToAbsoluteURL = pathToAbsoluteURL;
