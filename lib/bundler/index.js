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
const {LAYOUT_SUFFIX, HTML_SUFFIX} = require('../constants.js');
const {buildAssets, watchForAssetsChanges} = require('./assets.js');

const layoutsDirectory = path.join(
  process.cwd(),
  Configuration.directories.layouts
);

const contentsDirectory = path.join(
  process.cwd(),
  Configuration.directories.contents
);

/**
 * Builds all pages in a project.
 * If there are files with the same name in the *output*
 * directory, the new ones will overwrite them.
 *
 * @returns the building result of every page.
 */
const buildAll = async () => {
  const results = await Promise.all(
    Directory()
      .setSource(layoutsDirectory)
      .files()
      .filter((file) => !path.basename(file.source()).startsWith('.'))
      .map(buildPage)
  );

  await buildAssets();

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

/**
 * Starts watching for changes in *layouts* and *contents* directories.
 * It may be expanded with other directories which PostDoc will manage.
 */
const watchForChanges = () => {
  const layouts = Directory().setSource(layoutsDirectory);
  const contents = Directory().setSource(contentsDirectory);

  layouts
    .watch()
    .on('add', (filePath) => buildPage(File().setSource(filePath)))
    .on('change', (filePath) => buildPage(File().setSource(filePath)))
    .on('unlink', (filePath) =>
      File()
        .setSource(
          path.resolve(
            process.cwd(),
            Configuration.directories.output,
            filePath
              .replace(layoutsDirectory + path.sep, '')
              .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
          )
        )
        .remove()
    );

  contents
    .watch()
    .on('add', rebuildPageOnContentChange)
    .on('change', rebuildPageOnContentChange)
    .on('unlink', rebuildPageOnContentChange);

  watchForAssetsChanges();
};

exports.buildAll = buildAll;
exports.watchForChanges = watchForChanges;
