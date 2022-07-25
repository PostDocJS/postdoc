/**
 * @file Contains all configuration options that is used throughout
 *   the project. These options can be passed via Command Line,
 *   read from `.env` file or special configuration files: `postdoc.conf.js`
 *   or `postdoc.json`.
 *
 *   Precedence of the options sources (the highest is the most important):
 *
 *     Command-Line & .env
 *       -> postdoc.conf.mjs
 *        -> postdoc.conf.cjs
 *         -> postdoc.conf.js
 *          -> postdoc.json
 *
 *   Command-Line options can be merged with options from the `.env` file.
 *
 *   Files are exclusive. That means they won't be merged. Both of them support injecting
 *   environment variables via pattern "${VARIABLE_NAME}".
 *
 *   @example
 *   {
 *     option: "${OPTION_VARIABLE_NAME}"
 *   }
 *
 *   `postdoc.conf.[mc]?js` are able to return synchronous or asynchronous default functions.
 *
 *   @example
 *   module.exports = async () => {
 *     // fetches a config
 *   }
 *
 * @module configuration
 */

const process = require('process');

const dotenv = require('dotenv');

const {resolveConfig} = require('./resolve.js');
const {injectEnvironments} = require('./inject_environments.js');

const CONFIGURATION_ID = Symbol();

/**
 * Reads, parses and normalize the configuration options for the PostDoc.
 *
 * @returns {Promise<import('./defaults.js').Configuration>}
 */
const initializeConfiguration = async () => {
  dotenv.config({debug: Boolean(process.env.DEBUG)});

  return resolveConfig().then(injectEnvironments);
};

exports.CONFIGURATION_ID = CONFIGURATION_ID;
exports.initializeConfiguration = initializeConfiguration;
