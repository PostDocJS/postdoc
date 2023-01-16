/**
 * @file contains the Vite config creator.
 *
 * @module vite_config
 */

const {mergeConfig} = require('vite');

const {Directory} = require('../../files.js');
const {HTML_SUFFIX} = require('../../constants.js');
const {createPlugin} = require('./plugin.js');

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
exports.createViteConfiguration = (
  isProduction,
  postdocConfiguration,
  temporaryDirectory
) => {
  /** @type {import('vite').ResolvedConfig} */
  const viteConfiguration = {
    appType: 'custom',
    plugins: [createPlugin(postdocConfiguration)],
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
