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

import {env} from 'node:process';
import {resolve, normalize} from 'node:path';

import {config} from 'dotenv';

import {injectEnvironments} from './inject_environments.js';
import {resolveConfiguration} from './resolve.js';

export const CONFIGURATION_ID = Symbol();

/**
 * Reads, parses and normalize the configuration options for the PostDoc.
 *
 * @returns {Promise<import('./resolve.js').ResolvedConfiguration>}
 */
export const initializeConfiguration = async function () {
  config({debug: Boolean(env.DEBUG)});

  const resolvedConfiguration = await resolveConfiguration().then(injectEnvironments);

  resolvedConfiguration.configuration.directories = Object.entries(resolvedConfiguration.configuration.directories)
    .reduce(
      (accumulator, [key, value]) =>
        // Resolve and normalize directories, so we won't do that later.
        ({
          ...accumulator, [key]: value
            ? Array.isArray(value)
              ? value.map((path) => resolve(normalize(path)))
              : resolve(normalize(value))
            : value
        }), {}
    );

  return resolvedConfiguration;
};

export const createConfig = function (config) {
  const {app_settings = {}} = config;
  const keys = Reflect.ownKeys(app_settings);

  return keys.reduce((prev, key) => {
    Object.defineProperty(prev, key, {
      get: function() {
        return app_settings[key];
      },
      enumerable: true,
      configurable: false
    });

    return prev;
  }, {});
};