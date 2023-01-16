/**
 * @file contains a definition of the *Page* entity.
 *
 * @module entity
 */

const {sep, dirname, basename, extname, join} = require('path');

const {not} = require('../../utils/fp.js');
const {Directory, File} = require('../../files.js');
const {withURLSeparator} = require('../../utils/url.js');
const {
  MD_SUFFIX,
  EJS_SUFFIX,
  HTML_SUFFIX,
  LAYOUT_SUFFIX
} = require('../../constants.js');

const IGNORE_REGEXPS = [
  // Vim's swap files.
  /\.sw[po]$/
];

/**
 * Signals whether a file or directory is safe to skip.
 *
 * @param {import('../../files.js').IFile|import('../../files.js').IDirectory} entity
 */
const isIgnored = (entity) =>
  IGNORE_REGEXPS.some((re) => re.test(entity.source()));

/**
 * Preserves intermediate directories of the layout pages source path.
 *
 * @param {string} source
 * @param {string} pagesDirectory
 */
const preservePageDirectoryHierarchy = (source, pagesDirectory) => {
  const directoryName = dirname(source).replace(pagesDirectory, '');

  return directoryName.startsWith(sep)
    ? directoryName.replace(sep, '')
    : directoryName;
};

/**
 * The description of the section file of a page.
 *
 * @typedef {Object} Section
 * @property {string} name
 * @property {import('../../files.js').IFile} file
 */

/**
 * The entity that describes main parts of the static page.
 *
 * @typedef {Object} Page
 * @property {string} url - public URL of the page.
 * @property {import('../../files.js').IFile} layout
 * @property {import('../../files.js').IFile} content
 * @property {Section[]} sections
 * @property {import('../../files.js').IFile} output
 */

/**
 * Checks whether the *file* is a section.
 *
 * @param {import('../../files.js').IFile} file
 */
const isSection = (file) => {
  const filePath = file.source();

  return (
    basename(filePath).startsWith('_') && filePath.endsWith(MD_SUFFIX)
  );
};

/**
 * Signals whether a file is a layout.
 *
 * @param {import('../../files.js').IFile} file
 */
const isLayout = (file) => file.source().endsWith(LAYOUT_SUFFIX);

/**
 * Creates a URL for the layout file.
 *
 * @param {import('../../files.js').IFile} layout
 * @param {string} pagesDirectory
 * @returns {string}
 */
const computePageURLOf = (layout, pagesDirectory) => withURLSeparator(
  layout
    .source()
    .replace(pagesDirectory, '')
    .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
);

/**
 * @param {import('../../files.js').IFile} layout
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 * @returns {Page}
 */
const createPage = (layout, {directories: {pages, contents, output}}) => {
  const url = computePageURLOf(layout, pages);

  return {
    url,
    layout,
    content: File(
      layout
        .source()
        .replace(pages, contents)
        .replace(LAYOUT_SUFFIX, MD_SUFFIX)
    ),
    sections: basename(layout.source()).startsWith('index')
      ? Directory(
        dirname(
          layout.source().replace(pages, contents)
        )
      )
        .files()
        .filter(not(isIgnored))
        .filter(isSection)
        .map((page) => ({
          name: basename(page.source(), extname(page.source())).slice(1),
          file: page
        }))
      : [],
    output: File(
      join(
        output,
        preservePageDirectoryHierarchy(layout.source(), pages),
        basename(layout.source(), EJS_SUFFIX)
      )
    )
  };
};

/**
 * Collects layouts from all levels into an array.
 * All layouts are transformed into the {@link Page} instances.
 *
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 * @returns {Page[]}
 */
const getAllPages = (configuration) => Directory(configuration.directories.pages)
  .recursive(true)
  .files()
  .filter(isLayout)
  .map((layout) => createPage(layout, configuration));

exports.createPage = createPage;
exports.getAllPages = getAllPages;
exports.computePageURLOf = computePageURLOf;
