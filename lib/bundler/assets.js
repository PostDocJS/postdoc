/**
 * @file Contains the Vite configuration for bundling
 *   the assets of the page.
 *
 * @module bunder_assets
 */

const path = require('path');
const process = require('process');

const {build, createServer} = require('vite');

const {Directory} = require('../files.js');
const {Configuration} = require('../configuration/index.js');
const {BUILD_TEMPORAL_DIRECTORY} = require('../constants.js');

const outputDirectory = path.resolve(
  process.cwd(),
  Configuration.directories.output
);

const temporalBuildDirectory = path.resolve(
  process.cwd(),
  BUILD_TEMPORAL_DIRECTORY
);

/**
 * Builds the Vite inline config data.
 * Vite deletes the output directory before writing to it,
 * so we are putting pages into a temporal directory which
 * is served by the Vite then.
 *
 * @param {ReturnType<typeof Directory>} temporalDirectory
 */
const viteConfiguration = (temporalDirectory) => ({
  root: temporalDirectory.source(),
  clearScreen: false,
  server: {
    mode: 'development'
  },
  build: {
    mode: 'production',
    outDir: outputDirectory,
    rollupOptions: {
      input: temporalDirectory
        .files()
        .filter((file) => !path.basename(file.source()).startsWith('.'))
        .map((file) => file.source())
    }
  }
});

/**
 * Creates a development server over the _output_ directory
 * and watch for changes of pages.
 */
const watchForAssetsChanges = () =>
  createServer(viteConfiguration(Directory().setSource(outputDirectory)))
    .then((server) => server.listen())
    .then((server) => server.printUrls());

/**
 * Builds all assets that is included into the pages.
 * It uses the Vite bundler which add a capability to
 * add plugins in order to transform those assets somehow.
 */
const buildAssets = async () => {
  const temporalDirectory = await Directory()
    .setSource(outputDirectory)
    .move(temporalBuildDirectory);

  await build(viteConfiguration(temporalDirectory)).then(
    () => Directory().setSource(temporalBuildDirectory).remove(),
    () => Directory().setSource(temporalBuildDirectory).move(outputDirectory)
  );
};

exports.buildAssets = buildAssets;
exports.watchForAssetsChanges = watchForAssetsChanges;
