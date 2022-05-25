/**
 * @file Contains the bundler's main functions.
 *
 * @module bundler
 */

const path = require('path');
const process = require('process');

const {buildPage} = require('./page.js');
const {Configuration} = require('../configuration/index.js');
const {File, Directory} = require('../files.js');
const {buildAssets, serveOutput} = require('./assets.js');
const {HTML_SUFFIX, LAYOUT_SUFFIX} = require('../constants.js');

const layoutsDirectory = path.join(
  process.cwd(),
  Configuration.directories.layouts
);

const contentsDirectory = path.join(
  process.cwd(),
  Configuration.directories.contents
);

const outputDirectory = path.join(
  process.cwd(),
  Configuration.directories.output
);

/**
 * Builds all pages in a project.
 * If there are files with the same name in the *output*
 * directory, the new ones will overwrite them.
 *
 * @returns the building result of every page.
 */
const buildOnce = async () => {
  const results = await Promise.all(
    Directory()
      .setSource(layoutsDirectory)
      .files()
      .filter((file) => !path.basename(file.source()).startsWith('.'))
      .map(buildPage)
  );

  await buildAssets(false);

  return results;
};

/**
 * Rebuilds a page based on the content's file path.
 *
 * @param {string} filePath
 */
const rebuildPageOnContentChange = (filePath) =>
  buildPage(
    File().setSource(
      path.join(
        process.cwd(),
        Configuration.directories.layouts,
        path
          .dirname(filePath)
          .replace(
            path.join(process.cwd(), Configuration.directories.contents) +
              path.sep,
            ''
          ) + LAYOUT_SUFFIX
      )
    )
  );

const rebuildPageOnLayoutChange = (filePath) =>
  buildPage(File().setSource(filePath));

/**
 * Builds a project and continues watching for changes.
 * The built pages are available through the `localhost` and
 * local network.
 */
const buildIncrementally = async () => {
  const layouts = Directory().setSource(layoutsDirectory);
  const contents = Directory().setSource(contentsDirectory);

  // Sets up the development server.
  await serveOutput();

  // Builds pages.
  await Promise.all(
    layouts
      .files()
      .filter((file) => !path.basename(file.source()).startsWith('.'))
      .map(buildPage)
  );

  // Builds assets and watch for changes.
  await buildAssets(true);

  // Watches for the layouts change.
  layouts
    .watch()
    .on('add', rebuildPageOnLayoutChange)
    .on('change', rebuildPageOnLayoutChange)
    .on('unlink', (filePath) =>
      File()
        .setSource(
          path.join(
            outputDirectory,
            filePath
              .replace(layoutsDirectory + path.sep, '')
              .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
          )
        )
        .remove()
    );

  // Watches for the contents change.
  contents
    .watch()
    .on('add', rebuildPageOnContentChange)
    .on('change', rebuildPageOnContentChange)
    .on('unlink', rebuildPageOnContentChange);
};

exports.buildOnce = buildOnce;
exports.buildIncrementally = buildIncrementally;
