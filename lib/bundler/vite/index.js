const {build, createServer} = require('vite');

const {createViteConfiguration} = require('./config.js');

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 * @param {string} temporaryDirectory
 */
const makeBuild = async (postdocConfiguration, temporaryDirectory) => build(
  createViteConfiguration(true, postdocConfiguration, temporaryDirectory)
);

/**
 * @param {import('../../configuration/defaults.js').Configuration} postdocConfiguration
 */
const startServer = async (postdocConfiguration) => {
  const server = await createServer(createViteConfiguration(false, postdocConfiguration));

  await server.listen();

  server.printUrls();

  return server;
}; 

exports.build = makeBuild;
exports.startServer = startServer;
