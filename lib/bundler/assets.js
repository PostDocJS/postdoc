/**
 * @file Contains the Vite configuration for bundling
 *   the assets of the page.
 *
 * @module bunder_assets
 */

const path = require('path');
const process = require('process');

const {build, createServer, defineConfig} = require('vite');

const {Directory} = require('../files.js');
const {Configuration} = require('../configuration/index.js');
const {BUILD_TEMPORAL_DIRECTORY} = require('../constants.js');
const {info, MessageBuilder, Separator} = require('../logger/index.js');

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
 * @param {boolean} shouldWatch
 */
const viteConfiguration = (temporalDirectory, shouldWatch) =>
  defineConfig({
    root: temporalDirectory.source(),
    publicDir: path.resolve(process.cwd(), Configuration.directories.public),
    clearScreen: shouldWatch,
    optimizeDeps: {include: []},
    server: {host: true},
    resolve: {
      alias: {
        '~': process.cwd()
      }
    },
    build: {
      watch: shouldWatch ? {} : null,
      outDir: outputDirectory,
      emptyOutDir: true,
      rollupOptions: {
        input: temporalDirectory
          .recursive(true)
          .files()
          .filter((file) => !path.basename(file.source()).startsWith('.'))
          .map((file) => file.source())
      }
    }
  });

/** Creates a development server over the _output_ directory. */
const serveOutput = async () => {
  const configuration = viteConfiguration(
    await Directory().setSource(outputDirectory).create(),
    false
  );

  await createServer(configuration)
    .then((server) => server.listen())
    .then((server) => server.printUrls());

  MessageBuilder().line(Separator.Empty).pipe(info);
};

/**
 * Builds all assets that is included into the pages.
 * It uses the Vite bundler which add a capability to
 * add plugins in order to transform those assets somehow.
 *
 * @param {boolean} shouldWatch - Tells whether Vite should
 *   continue watching and rebuiling the site.
 */
const buildAssets = async (shouldWatch) => {
  const configuration = viteConfiguration(
    Directory().setSource(temporalBuildDirectory),
    shouldWatch
  );

  await build(configuration).finally(() =>
    !shouldWatch ? Directory().setSource(temporalBuildDirectory).remove() : null
  );
};

exports.buildAssets = buildAssets;
exports.serveOutput = serveOutput;
