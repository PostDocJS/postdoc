import {cwd} from 'node:process';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {normalize, join} from 'node:path';

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

export const resolveConfigWithDir = async (dir = cwd()) => {
  const packageDefinition = File(join(dir, 'package.json'));

  const {type: packageEnvironment = EnvironmentType.COMMONJS} =
    packageDefinition.exists()
      ? await packageDefinition.map(JSON.parse).content()
      : {};

  const configs = [
    {type: ConfigType.ESM, file: File(join(dir, 'postdoc.conf.mjs'))},
    {type: ConfigType.CJS, file: File(join(dir, 'postdoc.conf.cjs'))},
    {
      type:
        packageEnvironment === EnvironmentType.MODULE
          ? ConfigType.ESM
          : ConfigType.CJS,
      file: File(join(dir, 'postdoc.conf.js'))
    },
    {type: ConfigType.JSON, file: File(join(dir, 'postdoc.json'))}
  ];

  for (const {type, file} of configs) {
    if (file.exists()) {
      const configurationResolver =
        type === ConfigType.ESM
          ? await import(pathToFileURL(file.source()).toString()).then(
            ({default: resolver}) => resolver
          )
          : require(file.source());

      const configurationInstance = isObject(configurationResolver)
        ? configurationResolver
        : await Promise.resolve(configurationResolver());

      const {directories = {}} = configurationInstance;

      const isDefaultLanguageImplicit =
        !configurationInstance.i18n ||
        !configurationInstance.i18n.defaultLanguage;

      return {
        configuration: deepmerge(DEFAULTS, {
          ...configurationInstance,
          directories: {
            ...directories,
            tests: Array.isArray(directories.tests)
              ? directories.tests.map((directory) => normalize(directory))
              : directories.tests
                ? normalize(directories.tests)
                : DEFAULTS.directories.tests,
            contents:
              directories.contents ||
              directories.pages ||
              DEFAULTS.directories.contents
          }
        }),
        analysis: {
          isDefaultLanguageImplicit
        }
      };
    }
  }

  return {
    configuration: DEFAULTS,
    analysis: {
      isDefaultLanguageImplicit: true
    }
  };
};
