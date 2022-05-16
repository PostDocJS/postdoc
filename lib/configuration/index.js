/**
 * @file Contains all configuration options that is used throughout
 * the project. These options can be passed via Command Line,
 * readed from `.env` file or special configuration files: `postdoc.conf.js`
 * or `postdoc.json`.
 *
 * Precedence of the options sources (the highest is the most important):
 *
 *   Command-Line
 *    -> .env
 *     -> postdoc.conf.js
 *      -> postdoc.json
 *
 * Command-Line options can be merged with options from the `.env` file.
 *
 * `postdoc.conf.js` and `postdoc.json` are exclusive file configurations.
 * That means they won't be merged. Both of them should support injecting
 * environment variables via pattern "${VARIABLE_NAME}".
 *
 * @example
 * {
 *   option: "${OPTION_VARIABLE_NAME}"
 * }
 *
 * `postdoc.conf.js` is able to return synchronous or asynchronous default functions.
 * 
 * @example
 * module.exports = async () => {
 *   // fetches a config
 * }
 *
 * @module configuration
 */

/**
 * @typedef {Object} Configuration
 * @property {Object} logger - Options for the internal logger instance.
 * @property {boolean} logger.quiet - Signals that logger shouldn't pass messages to the output.
 */

/**
 * The default values for omitted configuration options.
 *
 * @default
 * @readonly
 * @type {Configuration}
 */
const DefaultConfiguration = {
  logger: {
    quiet: false
  }
};

/**
 * @readonly
 * @type {Configuration}
 *
 * @todo Merge options from all 4 configuration files that are described
 *   in the overview.
 */
exports.Configuration = {
  logger: {
    ...DefaultConfiguration.logger
  }
};
