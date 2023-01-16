const {resolve} = require('path');
const {pathToFileURL} = require('url');

const deepmerge = require('deepmerge');

const {File} = require('../files.js');
const {isObject} = require('../utils/fp.js');
const {DEFAULTS} = require('./defaults.js');

/**
 * Types of node environments.
 * https://nodejs.org/docs/latest-v12.x/api/packages.html#packages_determining_module_system
 *
 * @enum {string}
 * @readonly
 */
const EnvironmentType = Object.freeze({
  MODULE: 'module',
  COMMONJS: 'commonjs'
});

const {
  type: packageEnvironment = EnvironmentType.COMMONJS
} = File(resolve('package.json')).exists()
  ? require(resolve('package.json'))
  : {};

/**
 * Types of config files.
 *
 * @enum {string}
 * @readonly
 */
const ConfigType = Object.freeze({
  ESM: '$$esm',
  CJS: '$$cjs',
  JSON: '$$json'
});

/**
 * List of config files in order of precedence.
 * The first file has the highest precedence and the last one -
 * the lowest.
 */
const configs = [
  {type: ConfigType.ESM, file: File(resolve('postdoc.conf.mjs'))},
  {type: ConfigType.CJS, file: File(resolve('postdoc.conf.cjs'))},
  {
    type: packageEnvironment === EnvironmentType.MODULE ? ConfigType.ESM : ConfigType.CJS,
    file: File(resolve('postdoc.conf.js'))
  },
  {type: ConfigType.JSON, file: File(resolve('postdoc.json'))}
];

/**
 * Resolves the config file at the root of the project if it exists.
 * Otherwise, returns default values.
 *
 * @returns {Promise<import('./defaults.js').Configuration>}
 */
exports.resolveConfiguration = async () => {
  for (const {type, file} of configs) {
    if (file.exists()) {
      const configurationResolver = type === ConfigType.ESM
        ? /* eslint-disable */ await import(
            pathToFileURL(file.source()).toString()
          ).then(({default: resolver}) => resolver) /* eslint-enable */
        : require(file.source());

      const configurationInstance = isObject(configurationResolver)
        ? configurationResolver
        : await Promise.resolve(configurationResolver());

      return deepmerge(DEFAULTS, configurationInstance);
    }
  }

  return DEFAULTS;
};
