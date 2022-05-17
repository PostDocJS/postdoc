/**
 * @file Contains functions to colorize a text.
 *   Respects `NO_COLOR` environment variable.
 *   More about it and why we should support it
 *   [here](https://no-color.org).
 *
 * @module colors
 * @requires module:chalk
 * @requires module:configuration
 */

const {Instance, supportsColor} = require('chalk');

const {Configuration} = require('../configuration/index.js');

/**
 * A custom _chalk_ instance that preserves its behaviour (like chaining, etc)
 * while respecting the `NO_COLOR` option.
 */
exports.Typography = new Instance({
  level: Configuration.logger.noColors ? 0 : supportsColor.level
});
