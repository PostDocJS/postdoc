/**
 * @file Contains compiler for a single page.
 *   It handles only layouts and contents files.
 *   Other assets are handled by the third-party Vite
 *   bundler.
 *
 * @module bunder_page
 */

const path = require('path');
const process = require('process');

const ejs = require('ejs');
const {marked} = require('marked');

const {Configuration} = require('../configuration/index.js');
const {File, Directory} = require('../files.js');
const {
  MD_SUFFIX,
  EJS_SUFFIX,
  URI_DELIMITER,
  LAYOUT_SUFFIX,
  BUILD_TEMPORAL_DIRECTORY
} = require('../constants.js');

const layoutsDirectory = path.join(
  process.cwd(),
  Configuration.directories.layouts
);

const contentsDirectory = path.join(
  process.cwd(),
  Configuration.directories.contents
);

const includesDirectory = path.join(
  process.cwd(),
  Configuration.directories.includes
);

/**
 * Compiles content MD files for the _page_.
 * It is not a recursive operation. Files that are directly
 * under the *page*'s directory are read. That allows to
 * have deeply nested pages and not overlap the content.
 *
 * @example
 * /contents
 *   /home
 *     /hero-section.md
 *   /blog
 *     /first-articles-table.md
 *     /what-is-postdoc-and-why-do-we-need-it
 *       /intro.md
 *       /reasons.md
 *       /...
 *
 * @param {ReturnType<typeof File>} page
 */
const compileContents = (page) =>
  Directory()
    .setSource(
      path.join(
        contentsDirectory,
        page
          .source()
          .replace(layoutsDirectory + path.sep, '')
          .replace(LAYOUT_SUFFIX, '')
      )
    )
    .files()
    .filter((file) => file.source().endsWith(MD_SUFFIX))
    .map((file) => file.map(marked.parse));

/**
 * Compiles one EJS page with all contents and includes.
 *
 * @param {ReturnType<typeof File>} file
 */
const compilePage = (file) => {
  const uri = file
    .source()
    .replace(layoutsDirectory, '')
    .replace(LAYOUT_SUFFIX, '')
    .replace(path.sep, URI_DELIMITER);

  return file.map(async (content) =>
    ejs.render(
      content,
      {
        page: {
          uri,
          head: '',
          scripts: '',
          sections: await Promise.all(
            compileContents(file).map((file) => file.content())
          )
        }
      },
      {root: includesDirectory, views: includesDirectory, async: true}
    )
  );
};

/**
 * Preserves intermediate directories of the layout pages source path.
 *
 * @param {string} source
 */
const preservePageDirectoryHierarchy = (source) => {
  const directoryName = path.dirname(source).replace(layoutsDirectory, '');

  return directoryName.startsWith(path.sep)
    ? directoryName.replace(path.sep, '')
    : directoryName;
};

/**
 * Builds a page and writes it to the temporal build directory.
 * It should be the processed by the Vite and outputted to the
 * *ouput* directory. The file at the _destination_ path will
 * be overwritten if there is one.
 *
 * @param {ReturnType<typeof File>} file
 */
exports.buildPage = (file) =>
  compilePage(
    file.setDestination(
      path.resolve(
        process.cwd(),
        BUILD_TEMPORAL_DIRECTORY,
        preservePageDirectoryHierarchy(file.source()),
        path.basename(file.source(), EJS_SUFFIX)
      )
    )
  ).write();