/**
 * @file Contains all configuration options that are used throughout
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

import {env} from 'node:process';
import {resolve, normalize} from 'node:path';

import {config} from 'dotenv';

import {injectEnvironments} from './inject_environments.js';
import {resolveConfiguration} from './resolve.js';

export const CONFIGURATION_ID = Symbol();

/**
 * Reads, parses and normalize the configuration options for Postdoc.
 *
 * @returns {Promise<import('./resolve.js').ResolvedConfiguration>}
 */

// export const initializeConfiguration = async () => {
//   config({debug: Boolean(env.DEBUG)});
//
//   const resolvedConfiguration = await resolveConfiguration().then(injectEnvironments);
//
//   resolvedConfiguration.configuration.directories = Object.entries(resolvedConfiguration.configuration.directories)
//     .reduce((accumulator, [key, value]) => ({
//       ...accumulator,
//       [key]: value ? (
//         Array.isArray(value) ? value.map(function(path) {
//           return resolve(normalize(path));
//         }) : resolve(normalize(value))
//       ) : value
//       }), {}
//     );
//
//   return resolvedConfiguration;
// };


export const initializeConfiguration = async function () {
  // Enable debug mode based on environment variable.
  config({debug: Boolean(env.DEBUG)});

  // Fetch configuration and inject environments.
  const resolvedConfiguration = await resolveConfiguration().then(injectEnvironments);

  // Normalize directory paths.
  resolvedConfiguration.configuration.directories = Object.entries(resolvedConfiguration.configuration.directories)
    .reduce((accumulator, [key, value]) => {
      if (!value) {
        return {...accumulator, [key]: value};
      }

      if (!Array.isArray(value)) {
        value = [value];
      }

      const normalizedValue = value.map(function(path) {
        return resolve(normalize(path));
      });

      return {...accumulator, [key]: normalizedValue};
    }, {});

  return resolvedConfiguration;
};