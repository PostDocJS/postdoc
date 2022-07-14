/**
 * @file Contains the Vite configuration for bundling
 *   the assets of the page.
 *
 * @module bundler_assets
 */

const path = require('path');
const process = require('process');
const {inspect} = require('util');

const {build, createServer, defineConfig} = require('vite');

const {panic} = require('../utils/fp.js');
const {Symbols} = require('../logger/symbols.js');
const {Directory} = require('../files.js');
const {Typography} = require('../logger/colors.js');
const {Configuration} = require('../configuration/index.js');
const {BUILD_TEMPORAL_DIRECTORY, HTML_SUFFIX} = require('../constants.js');
const {
  info,
  error,
  Separator,
  LineBuilder,
  MessageBuilder
} = require('../logger/index.js');

const outputDirectory = path.resolve(
  process.cwd(),
  Configuration.directories.output
);

const temporalBuildDirectory = path.resolve(
  process.cwd(),
  BUILD_TEMPORAL_DIRECTORY
);

const publicDirectory = path.resolve(
  process.cwd(),
  Configuration.directories.public
);

/**
 * Builds the Vite inline config data.
 * Vite deletes the output directory before writing to it,
 * so we are putting pages into a temporal directory which
 * is served by the Vite then.
 *
 * @param {boolean} shouldWatch
 */
const viteBuildOptions = (shouldWatch) => {
  const directory = Directory().setSource(temporalBuildDirectory);

  return defineConfig({
    root: directory.source(),
    publicDir: publicDirectory,
    clearScreen: shouldWatch,
    optimizeDeps: {include: []},
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
        input: directory
          .recursive(true)
          .files()
          .filter((file) => file.source().endsWith(HTML_SUFFIX))
          .map((file) => file.source())
      }
    }
  });
};

/**
 * Builds entry points.
 *
 * @param {boolean} shouldWatch - determines whether Vite should rebuild
 *   entries on changes or not.
 * @returns a function that stops the {@link RollupWatcher} from observing the changes.
 *   It only works if the *shouldWatch* parameter is `true`.
 */
const buildEntries = async (shouldWatch) => {
  let isInProcess = true;

  const watcher = await build(viteBuildOptions(shouldWatch)).finally(() =>
    !shouldWatch ? Directory().setSource(temporalBuildDirectory).remove() : null
  );

  return async () =>
    shouldWatch && isInProcess
      ? watcher.close().then(() => (isInProcess = false))
      : undefined;
};

/**
 * Builds all assets that is included into the pages.
 * It uses the Vite bundler which add a capability to
 * add plugins in order to transform those assets somehow.
 *
 * @param {boolean} shouldWatch - Tells whether Vite should
 *   continue watching and rebuilding the site.
 * @returns a function that restarts the Vite build server.
 *   It ensures that the previous server is stopped.
 */
const buildAssets = async (shouldWatch) => {
  let stop = await buildEntries(shouldWatch);
  let restartTimeout = null;

  return async () => {
    await stop();

    if (restartTimeout !== null) {
      clearTimeout(restartTimeout);
    }

    restartTimeout = setTimeout(async () => {
      MessageBuilder()
        .line(
          LineBuilder()
            .text(Typography.cyan(Symbols.Diamond))
            .phrase('Restarting the vite build server...')
            .build()
        )
        .pipe(info);

      stop = await buildEntries(shouldWatch);

      restartTimeout = null;
    }, 200);
  };
};

/** Creates a development server over the _output_ directory. */
const serveOutput = async () => {
  const directoryResult = await Directory()
    .setSource(outputDirectory)
    .create()
    .map((directory) => directory.source())
    .run();

  if (directoryResult.isErr()) {
    directoryResult.mapErr((err) =>
      MessageBuilder()
        .line(
          LineBuilder()
            .text('The creation of the')
            .phrase(Typography.bold(outputDirectory))
            .phrase('has failed due to:')
            .build()
        )
        .line(inspect(err))
        .pipe(error)
    );

    return;
  }

  await createServer({
    root: directoryResult.extract(() => panic('Unreachable!')),
    server: {host: true},
    configFile: false
  })
    .then((server) => server.listen())
    .then((server) => {
      MessageBuilder().line(Separator.Empty).pipe(info);

      server.printUrls();
    });

  MessageBuilder().line(Separator.Empty).pipe(info);
};

exports.buildAssets = buildAssets;
exports.serveOutput = serveOutput;
