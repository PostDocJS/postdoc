/**
 * @file Contains functions to colorize a text.
 *   Respects `NO_COLOR` environment variable.
 *   More about it and why we should support it
 *   [here](https://no-color.org).
 *
 * @module colors
 */

import {Chalk, supportsColor} from 'chalk';

import {Container} from '../utils/container.js';
import {CONFIGURATION_ID} from '../configuration/index.js';

/** @type {import('chalk').Chalk|null} */
let chalkInstance = null;

/**
 * A custom _chalk_ instance that preserves its behaviour (like chaining, etc.)
 * while respecting the `NO_COLOR` option.
 *
 * @returns {import('chalk').Chalk}
 */
export const Typography = () => {
  const configuration = Container.get(CONFIGURATION_ID);

  return chalkInstance || (chalkInstance = new Chalk({
    level: configuration.logger.noColors || supportsColor === false
      ? 0
      : supportsColor.level
  }));
};
