/**
 * @file Contains the bundler's main functions.
 *   Bunder consists of the own EJS and MD compiler
 *   and the Vite as the post-process tool for compiled
 *   pages and assets like images, scripts, styles and other
 *   static files.
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
      .recursive(true)
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
        layoutsDirectory,
        path.dirname(filePath).replace(contentsDirectory + path.sep, '') +
          LAYOUT_SUFFIX
      )
    )
  );

/**
 * Rebuilds a page which is pointed by the layout's file path.
 *
 * @param {string} filePath - The file path to the changed layout.
 */
const rebuildPageOnLayoutChange = (filePath) =>
  buildPage(File().setSource(filePath));

/**
 * Builds a project and continues watching for changes.
 * The built pages are available through the `localhost` and
 * local network.
 */
const buildIncrementally = async () => {
  const layouts = Directory().setSource(layoutsDirectory).recursive(true);
  const contents = Directory().setSource(contentsDirectory).recursive(true);

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

  // Sets up the development server.
  serveOutput();
};

exports.buildOnce = buildOnce;
exports.buildIncrementally = buildIncrementally;
