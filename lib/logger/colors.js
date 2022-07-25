/**
 * @file Contains functions to colorize a text.
 *   Respects `NO_COLOR` environment variable.
 *   More about it and why we should support it
 *   [here](https://no-color.org).
 *
 * @module colors
 */

const {Instance, supportsColor} = require('chalk');

const {Container} = require('../utils/container.js');
const {CONFIGURATION_ID} = require('../configuration/index.js');

/** @type {import('chalk').Chalk|null} */
let chalkInstance = null;

/**
 * A custom _chalk_ instance that preserves its behaviour (like chaining, etc.)
 * while respecting the `NO_COLOR` option.
 *
 * @returns {import('chalk').Chalk}
 */
exports.Typography = () => {
  const configuration = Container.get(CONFIGURATION_ID);

  return chalkInstance || (chalkInstance = new Instance({
    level: configuration.logger.noColors ? 0 : supportsColor.level
  }));
};
