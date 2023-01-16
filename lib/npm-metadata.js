const {fetch} = require('./utils/fetch.js');

const REGISTRY_PREFIX = 'https://registry.npmjs.org';

/**
 * Fetches the latest stable version of the package.
 *
 * @param {string} name - of the package.
 * @returns {Promise<string>} - a version of the package.
 */
exports.getPackageVersion = (name) =>
  fetch(`${REGISTRY_PREFIX}/${name}`)
    .then((response) => response.json())
    .then((info) => info['dist-tags'].latest);
