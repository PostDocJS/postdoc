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
) => makeBuild(
  createViteBuildConfiguration(postdocConfiguration, temporaryDirectory)
);

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 */
export const startServer = async (postdocConfiguration) => {
  const server = await createServer(
    createViteDevelopmentConfiguration(postdocConfiguration)
  );

  await server.listen();

  server.printUrls();

  return server;
};

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {import('vite').UserConfig} additionalViteConfiguration
 */
export const startPreviewServer = async (postdocConfiguration, additionalViteConfiguration) => {
  const server = await preview(
    createVitePreviewConfiguration(postdocConfiguration, additionalViteConfiguration)
  );

  server.printUrls();

  return server;
};
