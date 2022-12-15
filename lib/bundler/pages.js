/**
 * @file contains the *Pages* entity which gathers the information
 *   about every page based on the FS hierarchy.
 *
 * @module pages
 */

const path = require('path');
const process = require('process');

const {not} = require('../utils/fp.js');
const {Container} = require('../utils/container.js');
const {Directory, File} = require('../files.js');
const {withURLSeparator} = require('../utils/url.js');
const {CONFIGURATION_ID} = require('../configuration/index.js');
const {
  MD_SUFFIX,
  JS_SUFFIX,
  TS_SUFFIX,
  CSS_SUFFIX,
  EJS_SUFFIX,
  HTML_SUFFIX,
  SASS_SUFFIX,
  SCSS_SUFFIX,
  LESS_SUFFIX,
  STYLUS_SUFFIX,
  LAYOUT_SUFFIX,
  BUILD_TEMPORAL_DIRECTORY
} = require('../constants.js');

const IGNORE_REGEXPS = [
  // Vim's swap files.
  /\.sw[po]$/
];

/**
 * Signals whether a file or directory is safe to skip.
 *
 * @param {import('../files.js').IFile|import('../files.js').IDirectory} entity
 */
const isIgnored = (entity) =>
  IGNORE_REGEXPS.some((re) => re.test(entity.source()));

/**
 * Preserves intermediate directories of the layout pages source path.
 *
 * @param {string} source
 */
const preservePageDirectoryHierarchy = (source) => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pagesDirectory = path.resolve(
    process.cwd(),
    configuration.directories.pages
  );

  const directoryName = path.dirname(source).replace(pagesDirectory, '');

  return directoryName.startsWith(path.sep)
    ? directoryName.replace(path.sep, '')
    : directoryName;
};

/**
 * The description of the section file of a page.
 *
 * @typedef {Object} Section
 * @property {string} name
 * @property {import('../files.js').IFile} file
 */

/**
 * The entity that describes main parts of the static page.
 *
 * @typedef {Object} Page
 * @property {Array<StructuredAPIFile>} api - sections that are built from tracked API files
 *  of some external package.
 * @property {string} url - public URL of the page.
 * @property {import('../files.js').IFile} layout
 * @property {import('../files.js').IFile} content
 * @property {Section[]} sections
 * @property {import('../files.js').IFile} output
 * @property {import('../files.js').IFile} temporaryOutput
 */

/**
 * Checks whether the *file* is a section.
 *
 * @param {import('../files.js').IFile} file
 */
const isSection = (file) => {
  const filePath = file.source();

  return (
    path.basename(filePath).startsWith('_') && filePath.endsWith(MD_SUFFIX)
  );
};

/**
 * Signals whether a file is a layout.
 *
 * @param {import('../files.js').IFile} file
 */
const isLayout = (file) => file.source().endsWith(LAYOUT_SUFFIX);

/**
 * Creates the File instance for a script file of the page.
 * All scripts should be created in the same directory as the page's layout file.
 * The main script file should have the same name as the layout file.
 *
 * @param {import('../files.js').IFile} layout
 * @returns {import('../files.js').IFile}
 */
const resolveScriptFile = (layout) => {
  const script = File();

  switch (true) {
    case script.setSource(layout.source().replace(LAYOUT_SUFFIX, JS_SUFFIX)).exists(): break;
    case script.setSource(layout.source().replace(LAYOUT_SUFFIX, TS_SUFFIX)).exists(): break;
  }

  return script;
};

/**
 * Creates the File instance for a style file of the page.
 * All styles should be created in the same directory as the page's layout file.
 * The main style file should have the same name as the layout file.
 *
 * @param {import('../files.js').IFile} layout
 * @returns {import('../files.js').IFile}
 */
const resolveStyleFile = (layout) => {
  const style = File();

  switch (true) {
    case style.setSource(layout.source().replace(LAYOUT_SUFFIX, CSS_SUFFIX)).exists(): break;
    case style.setSource(layout.source().replace(LAYOUT_SUFFIX, SCSS_SUFFIX)).exists(): break;
    case style.setSource(layout.source().replace(LAYOUT_SUFFIX, SASS_SUFFIX)).exists(): break;
    case style.setSource(layout.source().replace(LAYOUT_SUFFIX, LESS_SUFFIX)).exists(): break;
    case style.setSource(layout.source().replace(LAYOUT_SUFFIX, STYLUS_SUFFIX)).exists(): break;
  }

  return style;
};

/**
 * Creates a URL for the layout file.
 *
 * @param {import('../files.js').IFile} layout
 * @returns {string}
 */
const computePageURLOf = (layout) => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pagesDirectory = path.resolve(
    process.cwd(),
    configuration.directories.pages
  );

  return withURLSeparator(
    layout
      .source()
      .replace(pagesDirectory, '')
      .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
  );
};

/**
 * Collects layouts from all levels into an array.
 * All layouts are transformed into the {@link Page} instances.
 *
 * @returns {Page[]}
 */
const Pages = () => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pagesDirectory = path.resolve(
    process.cwd(),
    configuration.directories.pages
  );

  const contentDirectory = path.resolve(
    process.cwd(),
    configuration.directories.contents || configuration.directories.pages
  );

  const outputDirectory = path.resolve(
    process.cwd(),
    configuration.directories.output
  );

  return Directory()
    .setSource(pagesDirectory)
    .recursive(true)
    .files()
    .filter(isLayout)
    .map((layout) => {
      const url = computePageURLOf(layout);

      return {
        url,
        layout,
        content: File().setSource(
          layout
            .source()
            .replace(pagesDirectory, contentDirectory)
            .replace(LAYOUT_SUFFIX, MD_SUFFIX)
        ),
        sections: path.basename(layout.source()).startsWith('index')
          ? Directory()
            .setSource(
              path.dirname(
                layout.source().replace(pagesDirectory, contentDirectory)
              )
            )
            .files()
            .filter(not(isIgnored))
            .filter(isSection)
            .map((page) => ({
              name: path
                .basename(page.source(), path.extname(page.source()))
                .slice(1),
              file: page
            }))
          : [],
        temporaryOutput: File().setSource(
          path.resolve(
            process.cwd(),
            BUILD_TEMPORAL_DIRECTORY,
            preservePageDirectoryHierarchy(layout.source()),
            path.basename(layout.source(), EJS_SUFFIX)
          )
        ),
        output: File().setSource(
          path.resolve(
            outputDirectory,
            preservePageDirectoryHierarchy(layout.source()),
            path.basename(layout.source(), EJS_SUFFIX)
          )
        ),
        style: resolveStyleFile(layout),
        script: resolveScriptFile(layout)
      };
    });
};

exports.Pages = Pages;
exports.computePageURLOf = computePageURLOf;
