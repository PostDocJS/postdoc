import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {normalize, resolve} from 'node:path';

import deepmerge from 'deepmerge';

import {File} from '../files.js';
import {isObject} from '../utils/fp.js';
import {DEFAULTS} from './defaults.js';

/**
 * Types of node environments.
 * https://nodejs.org/docs/latest-v12.x/api/packages.html#packages_determining_module_system
 *
 * @enum {string}
 * @readonly
 */
const EnvironmentType = {
  MODULE: 'module',
  COMMONJS: 'commonjs'
};

/**
 * Types of config files.
 *
 * @enum {string}
 * @readonly
 */
const ConfigType = {
  ESM: '$$esm',
  CJS: '$$cjs',
  JSON: '$$json'
};

const CONFIG_FILES = [
  {type: ConfigType.ESM, file: 'postdoc.conf.mjs'},
  {type: ConfigType.CJS, file: 'postdoc.conf.cjs'},
  {type: ConfigType.JSON, file: 'postdoc.json'}
];

const require = createRequire(import.meta.url);

/**
 * @typedef {Object} ConfigurationAnalysis
 * @property {boolean} isDefaultLanguageImplicit
 */

/**
 * @typedef {Object} ResolvedConfiguration
 * @property {import('./defaults.js').Configuration} configuration
 * @property {ConfigurationAnalysis} analysis
 */

/**
 * Reads and parses the package definition if it exists.
 *
 * @returns {Object} package definition
 */
async function getPackageDefinition() {
  const packageDefinition = File(resolve('package.json'));

  return packageDefinition.exists() ? await packageDefinition.map(JSON.parse).content() : {};
}

/**
 * Resolves and imports the configuration file.
 *
 * @param {ConfigType} type
 * @param {string} file
 * @returns {import('./defaults.js').Configuration} configuration
 */
async function importConfiguration(type, file) {
  if (type === ConfigType.ESM) {
    const imported = await import(pathToFileURL(file).toString());

    return imported.default;
  }

  return require(file);
}

/**
 * Returns the default configuration object
 *
 * @returns {ResolvedConfiguration}
 */
function defaultConfiguration() {
  return {
    configuration: DEFAULTS,
    analysis: {
      isDefaultLanguageImplicit: true,
    },
  };
}

/**
 * Normalizes the directories from the configuration
 *
 * @param {Object} directories - The directories object from the configuration
 * @returns {Object} - The normalized directories object
 */
function normalizeDirectories(directories) {
  return {
    tests: Array.isArray(directories.tests)
      ? directories.tests.map((directory) => normalize(directory))
      : directories.tests
        ? normalize(directories.tests)
        : DEFAULTS.directories.tests,
    contents: directories.contents || directories.pages || DEFAULTS.directories.contents
  };
}


/**
 * Resolves the config file at the root of the project if it exists.
 * Otherwise, returns default values.
 *
 * @returns {Promise<ResolvedConfiguration>}
 */
export const resolveConfiguration = async function () {
  const {type: packageEnvironment = EnvironmentType.COMMONJS} = await getPackageDefinition();

  /**
   * List of config files in order of precedence.
   * The first file has the highest precedence and the last one -
   * the lowest.
   */
  const configs = [
    {type: ConfigType.ESM, file: resolve('postdoc.conf.mjs')},
    {type: ConfigType.CJS, file: resolve('postdoc.conf.cjs')},
    {
      type: packageEnvironment === EnvironmentType.MODULE ? ConfigType.ESM : ConfigType.CJS,
      file: resolve('postdoc.conf.js')
    },
    {type: ConfigType.JSON, file: resolve('postdoc.json')}
  ];

  for (const {type, file} of configs) {
    const configFile = File(file);

    if (configFile.exists()) {
      const configurationResolver = await importConfiguration(type, configFile.source());

      const configurationInstance = isObject(configurationResolver)
        ? configurationResolver
        : await Promise.resolve(configurationResolver());

      const {directories = {}} = configurationInstance;
      const isDefaultLanguageImplicit = !configurationInstance.i18n || !configurationInstance.i18n.defaultLanguage;
      const normalizedDirectories = normalizeDirectories(directories);

      return {
        configuration: deepmerge(DEFAULTS, {
          ...configurationInstance,
          directories: normalizedDirectories
        }),
        analysis: {
          isDefaultLanguageImplicit
        }
      };
    }
  }

  return defaultConfiguration();
};