import {build as makeBuild, createServer} from 'vite';

import {createViteConfiguration} from './config.js';

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {string} temporaryDirectory
 */
export const build = async (
  postdocConfiguration,
  temporaryDirectory
) => makeBuild(
  createViteConfiguration(true, postdocConfiguration, temporaryDirectory)
);

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 */
export const startServer = async (postdocConfiguration) => {
  const server = await createServer(
    createViteConfiguration(false, postdocConfiguration)
  );

  await server.listen();

  server.printUrls();

  return server;
}; 
