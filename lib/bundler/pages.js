/**
 * @file Contains:
 *   1. The *Pages* entity which gathers the information
 *      about every page based on the FS hierarchy.
 *   2. The *PublicApiOf* entity which exposes the API for working
 *      with the pages' information to the EJS templates.
 *
 * @module pages
 */

const path = require('path');
const process = require('process');

const {not} = require('../utils/fp.js');
const {Configuration} = require('../configuration/index.js');
const {Directory, File} = require('../files.js');
const {withURLSeparator} = require('../utils/url.js');
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
  URL_DELIMITER,
  BUILD_TEMPORAL_DIRECTORY
} = require('../constants.js');

const pagesDirectory = path.resolve(
  process.cwd(),
  Configuration.directories.pages
);

const contentDirectory = path.resolve(
  process.cwd(),
  Configuration.directories.contents || Configuration.directories.pages
);

const outputDirectory = path.resolve(
  process.cwd(),
  Configuration.directories.output
);

const IGNORE_REGEXPS = [
  // Vim's swap files.
  /\.sw[po]$/
];

/**
 * Signals whether a file or directory is safe to skip.
 *
 * @param {ReturnType<typeof File>|ReturnType<typeof Directory>} entity
 */
const isIgnored = (entity) =>
  IGNORE_REGEXPS.some((re) => re.test(entity.source()));

/**
 * Preserves intermediate directories of the layout pages source path.
 *
 * @param {string} source
 */
const preservePageDirectoryHierarchy = (source) => {
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
 * @property {ReturnType<typeof File>} file
 */

/**
 * The entity that describes main parts of the static page.
 *
 * @typedef {Object} Page
 * @property {string} url - public URL of the page.
 * @property {ReturnType<typeof File>} layout
 * @property {ReturnType<typeof File>} content
 * @property {Section[]} sections
 * @property {ReturnType<typeof File>} output
 * @property {ReturnType<typeof File>} temporaryOutput
 */

/**
 * Checks whether the *file* is a section.
 *
 * @param {ReturnType<typeof File>} file
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
 * @param {ReturnType<typeof File>} file
 */
const isLayout = (file) => file.source().endsWith(LAYOUT_SUFFIX);

/**
 * Creates the File instance for a script file of the page.
 * All scripts should be created in the same directory as the page's layout file.
 * The main script file should have the same name as the layout file.
 *
 * @param {ReturnType<typeof File>} layout
 * @returns {ReturnType<typeof File>}
 */
const resolveScriptFile = (layout) => {
  let script = File();

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
 * @param {ReturnType<typeof File>} layout
 * @returns {ReturnType<typeof File>}
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
 * Collects layouts from all levels into an array.
 * All layouts are transformed into the {@link Page} instances.
 *
 * @returns {Page[]}
 */
const Pages = () =>
  Directory()
    .setSource(pagesDirectory)
    .recursive(true)
    .files()
    .filter(isLayout)
    .map((layout) => ({
      url: withURLSeparator(
        layout
          .source()
          .replace(pagesDirectory, '')
          .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
      ),
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
    }));

/**
 * Creates the RegExp that covers URLs right under the passed one.
 * It matches either the *subpage_name.html* or *subpage_name/index.html*
 * patterns and exclude the page which is described by the *url*.
 *
 * @param {string} url
 * @returns {RegExp}
 */
const directPagesOf = (url) =>
  new RegExp(
    '^'
    + url.replace(URL_DELIMITER, '\\' + URL_DELIMITER)
    + (url.endsWith(URL_DELIMITER) ? '' : '\\' + URL_DELIMITER)
    + `(?:i(?!ndex)[^\\${URL_DELIMITER}]*|[^i\\${URL_DELIMITER}][^\\${URL_DELIMITER}]*|[^\\${URL_DELIMITER}]+\\${URL_DELIMITER}index)`
    + `\\${HTML_SUFFIX}$`
  );

/**
 * @typedef {Object} PublicSectionInfo
 * @property {string} name
 * @property {string} url
 */

/**
 * @typedef {Object} PublicPageInfo
 * @property {string} url
 * @property {readonly PublicSectionInfo[]} sections
 */

/**
 * Creates an API over the passed *pages* array.
 * That API is exposed to the EJS templates and can be used by the user.
 *
 * @param {readonly Page[]} pages
 */
const PublicApiOf = (pages) => ({
  /**
   * Returns the list of subpages of the page which is matched with
   * the *url* parameter.
   * By default, only direct subpages are returned. But the
   * user can include all deeply nested subpages by setting the `true`
   * value to the *includeNested* property.
   *
   * @param {string} url
   * @returns {readonly PublicPageInfo[]}
   */
  subPagesOf: (url, {includeNested = false} = {}) =>
    pages
      .filter((page) =>
        includeNested
          ? page.url.startsWith(url)
            && page.url !== (
              url
              + (url.endsWith(URL_DELIMITER) ? '' : URL_DELIMITER)
              + 'index' + HTML_SUFFIX
            )
          : directPagesOf(url).test(page.url)
      )
      .map((page) => ({
        url: page.url,
        sections: page.sections.map(({name}) => ({
          name,
          url: page.url + '#' + name
        }))
      }))
});

exports.Pages = Pages;
exports.PublicApiOf = PublicApiOf;
