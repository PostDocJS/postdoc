/**
 * @file Contains the default properties for configuration object.
 *
 * @module defaults
 */

import {env} from 'node:process';

/**
 * @typedef {Object} Configuration
 *
 * @property {Object} directories - Contains options of names of the
 *   special directories.
 * @property {string|Array<string>} directories.api - An absolute or relative path[s]
 *  to directories witch should be used in API sections generation.
 * @property {string} directories.pages - Directory for the MD files. If it is set, then CLI
 *   will search for the MD files there.
 * @property {string} directories.tests - Directory name for the tests.
 * @property {string} directories.output - Directory name for the compiled files.
 * @property {string} directories.public - Directory name for the public files.
 *   Those files will be simply copied to the *output* directory as is. You can refer to them
 *   by starting the URL with the leading slash **\/**.
 * @property {string} directories.layouts - Directory where the pages' layouts live.
 * @property {string} directories.includes - Directory name for the server-side components.
 *   Server-side components are plain EJS files with some global data that is available only
 *   while compilation process.
 *
 * @property {Object} i18n - Optiosn for the internationalisation module.
 * @property {Array<string>} i18n.languages - a list of language codes supported by the project.
 * @property {string} i18n.defaultLanguage - a code of the default language.
 *
 * @property {Object} logger - Options for the internal logger instance.
 * @property {boolean} logger.quiet - Signals that logger shouldn't pass messages to the output.
 * @property {boolean} logger.noColors - Signals that logger shouldn't colorize the output.
 *   By default, it equals `true`, when [NO_COLOR](https://no-color.org) environment variable
 *   is set. Otherwise, `false`.
 *
 * @property {'dox' | '@microsoft/api-extractor' | Record<'dox' | '@microsoft/api-extractor', Object>} apiExtractor -
 *  Name of the API extractor. By default, `dox` is used.
 */

/**
 * The default values for omitted configuration options.
 *
 * @default
 * @readonly
 * @type {Partial<Configuration>}
 */
export const DEFAULTS = {
  i18n: {
    languages: [],
    defaultLanguage: 'en'
  },
  directories: {
    api: null,
    pages: 'pages',
    tests: 'test',
    output: 'out',
    public: 'public',
    layouts: 'pages',
    includes: 'includes'
  },
  logger: {
    quiet: false,
    // We can directly access environment variable here, because it might be set
    // by third party tool or the environment itself.
    noColors: Boolean(env.NO_COLOR)
  },
  apiExtractor: 'dox'
};
