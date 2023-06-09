/**
 * @file contains the Vite config creator.
 *
 * @module vite_config
 */

import {mergeConfig} from 'vite';

import {VitePWA} from 'vite-plugin-pwa';

import {Directory} from '../../files.js';
import {HTML_EXTENSION} from '../../constants.js';
import {createPlugin} from './plugin.js';

/**
 * Creates a Vite configuration object.
 *
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration 
 * @param {(config: import('vite').ResolvedConfig) => Partial<import('vite').ResolvedConfig>} deriveConfig
 * @returns {Promise<import('vite').ResolvedConfig>}
 */
const getUserConfig = function(postdocConfiguration, deriveConfig) {
  const defaultViteConfig = {
    appType: 'custom',
    plugins: [
      createPlugin(postdocConfiguration),
      VitePWA(postdocConfiguration.pwa)
    ],
    publicDir: postdocConfiguration.directories.public,
    build: {
      outDir: postdocConfiguration.directories.output,
      emptyOutDir: true
    }
  };

  return mergeConfig(defaultViteConfig, deriveConfig(defaultViteConfig));
};

/**
 * Creates a configuration object depending
 * of the current mode. PostDoc works in two
 * modes: *development* and *production*.
 *
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration 
 * @param {(config: import('vite').ResolvedConfig) => Partial<import('vite').ResolvedConfig>} deriveConfig
 * @returns {Promise<import('vite').ResolvedConfig>}
 */
export const createViteDevelopmentConfiguration = getUserConfig;

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {string} temporaryDirectory
 * @returns {Promise<import('vite').ResolvedConfig>}
*/
export const createViteBuildConfiguration = (postdocConfiguration, temporaryDirectory) => {
  const temporaryBuildDirectory = Directory(temporaryDirectory);

  return getUserConfig(postdocConfiguration, () => ({
    root: temporaryDirectory,
    appType: 'mpa',
    build: {
      rollupOptions: {
        input: temporaryBuildDirectory
          .recursive(true)
          .files()
          .filter((file) => file.source().endsWith(HTML_EXTENSION))
          .map((file) => file.source())
      }
    }
  }));
};

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {(config: import('vite').ResolvedConfig) => Partial<import('vite').ResolvedConfig>} deriveConfig
 * @returns {Promise<import('vite').ResolvedConfig>}
*/
export const createVitePreviewConfiguration = (postdocConfiguration, deriveConfig) =>
  getUserConfig(postdocConfiguration, (config) => ({
    ...deriveConfig(config),
    appType: 'mpa'
  }));
