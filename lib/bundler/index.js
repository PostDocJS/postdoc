/**
 * @file Contains the bundler's main functions.
 *
 * @module bundler
 */

const path = require('path');
const process = require('process');

const {buildPage} = require('./compilation.js');
const {Typography} = require('../logger/colors.js');
const {Configuration} = require('../configuration/index.js');
const {File, Directory} = require('../files.js');
const {LAYOUT_SUFFIX, HTML_SUFFIX} = require('../constants.js');
const {info, LineBuilder, MessageBuilder} = require('../logger/index.js');

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
const buildAll = () =>
  Promise.all(
    Directory()
      .setSource(layoutsDirectory)
      .files()
      .filter((file) => !path.basename(file.source()).startsWith('.'))
      .map(buildPage)
  );

/**
 * Ouputs a message that content of the page is changed
 * and page is rebuilding.
 *
 * @param {string} filePath - A source path to the content.
 */
const logChangeOf = (filePath) =>
  MessageBuilder()
    .line(
      LineBuilder()
        .text('The')
        .phrase(Typography.dim('CWD'))
        .text(Typography.bold(filePath.replace(process.cwd(), '')))
        .phrase('file was changed. Rebuilding the page...')
        .build()
    )
    .pipe(info);

/**
 * Rebuilds a page based on the content's file path.
 *
 * @param {string} filePath
 */
const rebuildPageOnContentChange = (filePath) => {
  logChangeOf(filePath);

  return buildPage(
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
};

/**
 * Starts watching for changes in *layouts* and *contents* directories.
 * It may be expanded with other directories which PostDoc will manage.
 */
const watchForChanges = () => {
  const layouts = Directory().setSource(layoutsDirectory);
  const contents = Directory().setSource(contentsDirectory);

  layouts
    .watch()
    .on('add', (filePath) => {
      MessageBuilder()
        .line(
          LineBuilder()
            .text('A new')
            .phrase(Typography.dim('CWD'))
            .text(Typography.bold(filePath.replace(process.cwd(), '')))
            .phrase('page was added.')
            .build()
        )
        .pipe(info);

      buildPage(File().setSource(filePath));
    })
    .on('change', (filePath) => {
      MessageBuilder()
        .line(
          LineBuilder()
            .text('The')
            .phrase(Typography.dim('CWD'))
            .text(Typography.bold(filePath.replace(process.cwd(), '')))
            .phrase('was changed. Rebuilding...')
            .build()
        )
        .pipe(info);

      buildPage(File().setSource(filePath));
    })
    .on('unlink', (filePath) => {
      MessageBuilder()
        .line(
          LineBuilder()
            .text('The')
            .phrase(Typography.dim('CWD'))
            .text(Typography.bold(filePath.replace(layoutsDirectory, '')))
            .phrase('was deleted. Removing it from the output...')
            .build()
        )
        .pipe(info);

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
        .remove();
    });

  contents
    .watch()
    .on('add', rebuildPageOnContentChange)
    .on('change', rebuildPageOnContentChange)
    .on('unlink', rebuildPageOnContentChange);
};

exports.buildAll = buildAll;
exports.watchForChanges = watchForChanges;
