import {build as makeBuild, createServer, preview} from 'vite';

import {
  createViteBuildConfiguration,
  createVitePreviewConfiguration,
  createViteDevelopmentConfiguration
} from './config.js';

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {string} temporaryDirectory
 */
export const build = async (
  postdocConfiguration,
  temporaryDirectory
) => {
  const config = createViteBuildConfiguration(postdocConfiguration, temporaryDirectory);

  return makeBuild(config);
}

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {import('vite').UserConfig} additionalOptions
 * @returns {Promise<import('vite').ViteDevServer>}
 */
export const startServer = async (postdocConfiguration, additionalOptions) => {
  const config = createViteDevelopmentConfiguration(postdocConfiguration, (_config) => {
   return additionalOptions; 
  });

  const server = await createServer(config);

  await server.listen();

  server.printUrls();

  return server;
};

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {import('vite').UserConfig} additionalViteConfiguration
 * @returns {Promise<import('vite').ViteDevServer>}
 */
export const startPreviewServer = async (postdocConfiguration, additionalViteConfiguration) => {
  const config = createVitePreviewConfiguration(postdocConfiguration, (_config) => {
    return additionalViteConfiguration;
  });

  const server = await preview(config);

  server.printUrls();

  return server;
};
