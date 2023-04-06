/**
 * @file contains the Vite config creator.
 *
 * @module vite_config
 */

import {mergeConfig} from 'vite';

import {VitePWA} from 'vite-plugin-pwa';

import {Directory} from '../../files.js';
import {HTML_SUFFIX} from '../../constants.js';
import {createPlugin} from './plugin.js';

/**
 * Creates a configuration object depending
 * of the current mode. PostDoc works in two
 * modes: *development* and *production*.
 *
 * @param {boolean} isProduction
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration 
 * @param {string} [temporaryDirectory]
 * @returns {import('vite').ResolvedConfig}
 */
export const createViteConfiguration = (
  isProduction,
  postdocConfiguration,
  temporaryDirectory
) => {
  /** @type {import('vite').ResolvedConfig} */
  const viteConfiguration = {
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

  if (isProduction) {
    const temporaryBuildDirectory = Directory(temporaryDirectory);

    return mergeConfig(viteConfiguration, {
      root: temporaryDirectory,
      appType: 'mpa',
      build: {
        rollupOptions: {
          input: temporaryBuildDirectory 
            .recursive(true)
            .files()
            .filter((file) => file.source().endsWith(HTML_SUFFIX))
            .map((file) => file.source())
        }
      }
    }, true);
  }

  return viteConfiguration;
};
