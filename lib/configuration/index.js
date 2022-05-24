/**
 * @file Contains all configuration options that is used throughout
 * the project. These options can be passed via Command Line,
 * readed from `.env` file or special configuration files: `postdoc.conf.js`
 * or `postdoc.json`.
 *
 * Precedence of the options sources (the highest is the most important):
 *
 *   Command-Line & .env
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

const process = require('process');

/**
 * @typedef {Object} Configuration
 *
 * @property {Object} directories - Contains options of names of the
 *   special directories.
 * @property {string} directories.tests - Directory name for the tests.
 * @property {string} directories.output - Directory name for the compiled files.
 * @property {string} directories.layouts - Directory name for the page layouts.
 * @property {string} directories.includes - Directory name for the server-side components.
 *   Server-side components are plain EJS files with some global data that is available only
 *   while compilation process.
 * @property {string} directories.contents - Directory name for the MD content files for pages.
 * @property {string} directories.components - Directory name for the client-side components.
 *   Client-side components don't have an access to the data of the server-side components.
 *
 * @property {Object} logger - Options for the internal logger instance.
 * @property {boolean} logger.quiet - Signals that logger shouldn't pass messages to the output.
 * @property {boolean} logger.noColors - Signals that logger shouldn't colorize the output.
 *   By default, it equals `true`, when [NO_COLOR](https://no-color.org) environment variable
 *   is set. Otherwise, `false`.
 *
 * @property {Object} devServer - Options for the internal development server.
 * @property {number} devServer.port - Port on which the development server should listen.
 */

/**
 * The default values for omitted configuration options.
 *
 * @default
 * @readonly
 * @type {Configuration}
 */
const DefaultConfiguration = {
  directories: {
    tests: 'test',
    output: 'out',
    layouts: 'layouts',
    includes: 'includes',
    contents: 'contents',
    components: 'components'
  },
  logger: {
    quiet: false,
    // We can directly access environment variable here, because it might be set
    // by third party tool or environment itself.
    noColors: Boolean(process.env.NO_COLOR)
  },
  devServer: {
    port: 3434
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
  directories: {
    ...DefaultConfiguration.directories
  },
  logger: {
    ...DefaultConfiguration.logger
  },
  devServer: {
    ...DefaultConfiguration.devServer
  }
};
