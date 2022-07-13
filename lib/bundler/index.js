/**
 * @file Contains the bundler's main functions.
 *   Bundler consists of the own EJS and MD compiler
 *   and the Vite as the post-process tool for compiled
 *   pages and assets like images, scripts, styles and other
 *   static files.
 *
 * @module bundler
 */

const path = require('path');
const process = require('process');

const {build} = require('./page.js');
const {Directory, File} = require('../files.js');
const {mergeResults} = require('../utils/result.js');
const {mergeFutures} = require('../utils/future.js');
const {Configuration} = require('../configuration/index.js');
const {Pages, PublicApiOf} = require('./pages.js');
const {buildAssets, serveOutput} = require('./assets.js');
const {
  HTML_SUFFIX,
  LAYOUT_SUFFIX,
  BUILD_TEMPORAL_DIRECTORY
} = require('../constants.js');

const pagesDirectory = path.join(
  process.cwd(),
  Configuration.directories.pages
);

const contentsDirectory = path.join(
  process.cwd(),
  Configuration.directories.contents || Configuration.directories.pages
);

const temporalBuildDirectory = path.join(
  process.cwd(),
  BUILD_TEMPORAL_DIRECTORY
);

/**
 * Builds a project.
 * Returns an object with the build result information and
 * controls that allows to restart build or stop it when the
 * *shouldWatch* param is `true`. Otherwise, controls does nothing.
 *
 * @param {boolean} shouldWatch
 */
const buildProject = async (shouldWatch) => {
  const allPages = Pages();

  const buildPageWithAPI = build(PublicApiOf(allPages));

  const results = await mergeFutures(allPages.map(buildPageWithAPI))
    .map(mergeResults)
    .run();

  const restart = await buildAssets(shouldWatch);

  return {results, restart};
};

/**
 * Builds all pages in a project.
 * If there are files with the same name in the *output*
 * directory, the new ones will overwrite them.
 *
 * @returns the building result of every page.
 */
const buildOnce = () => buildProject(false).then(({results}) => results);

/**
 * Searches for a page based on the FS *path*.
 * *path* can be the page's layout, content or one
 * of the sections.
 *
 * @param {string} path
 * @param {import('./pages.js').Page[]} all
 */
const getPage = (path, all) =>
  all.find(
    (page) =>
      page.layout.source() === path ||
      page.content.source() === path ||
      page.sections.some((section) => section.file.source() === path)
  );

/**
 * Rebuilds the page.
 *
 * @param {string} filePath
 */
const rebuild = (filePath) => {
  const pages = Pages();

  return build(PublicApiOf(pages))(getPage(filePath, pages)).run();
};

/**
 * Builds a project and continues watching for changes.
 * The built pages are available through the `localhost` and
 * local network.
 */
const buildIncrementally = async () => {
  const {restart} = await buildProject(true);

  // Watches for the layouts change.
  Directory()
    .setSource(pagesDirectory)
    .recursive(true)
    .watch()
    .on('add', rebuild)
    .on('change', rebuild)
    .on('unlink', async (filePath) => {
      if (filePath.endsWith(LAYOUT_SUFFIX)) {
        File()
          .setSource(
            filePath
              .replace(pagesDirectory, temporalBuildDirectory)
              .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
          )
          .remove()
          .run();
      } else {
        rebuild(filePath);
      }
    });

  if (pagesDirectory !== contentsDirectory) {
    // Watches for the contents change.
    Directory()
      .setSource(contentsDirectory)
      .recursive(true)
      .watch()
      .on('add', rebuild)
      .on('change', rebuild)
      .on('unlink', rebuild);
  }

  // If the count of the HTML files is changed then
  // the Vite bundler should be restarted with a new list of
  // HTML entry points.
  Directory()
    .setSource(temporalBuildDirectory)
    .recursive(true)
    .watch()
    .on('add', restart)
    .on('unlink', restart);

  // Sets up the development server.
  await serveOutput();
};

exports.buildOnce = buildOnce;
exports.buildIncrementally = buildIncrementally;
