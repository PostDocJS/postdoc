/**
 * @file Contains function to work with the URL entity.
 *
 * @module url
 */

import {sep} from 'node:path';

import {URL_DELIMITER} from '../../lib/constants.js';

/**
 * @typedef {Object} WithUrlSeparatorOptions
 * @property {boolean} [leadingSlash] - determines whether an URL should be absolute.
 */

/**
 * Replaces the OS path delimiter with the `/`.
 *
 * @param {string} filePath
 * @param {WithUrlSeparatorOptions} [options]
 * @returns {string}
 */
export const withURLSeparator = (filePath, {leadingSlash} = {}) => {
  let url = filePath.replace(new RegExp(`\\${sep}`, 'g'), URL_DELIMITER);

  if (leadingSlash === true) {
    if (!url.startsWith(URL_DELIMITER)) {
      url = URL_DELIMITER + url;
    }
  } else if (leadingSlash === false) {
    if (url.startsWith(URL_DELIMITER)) {
      url = url.slice(1);
    }
  } else {
    // Do do anything if the value is undefined.
  }

  return url;
};
