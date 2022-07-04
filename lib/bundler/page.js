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
  Configuration.directories.pages
);

const contentsDirectory = path.join(
  process.cwd(),
  Configuration.directories.contents || Configuration.directories.pages
);

const includesDirectory = path.join(
  process.cwd(),
  Configuration.directories.includes
);

/**
 * Compiles sections of the _page_.
 * It is not a recursive operation. Files that are directly
 * under the *page*'s directory are read. That allows to
 * have deeply nested pages and not overlap the content.
 *
 * @example
 * /contents
 *   /home
 *     /_hero-section.md
 *   /blog
 *     /first-articles-table.md
 *     /what-is-postdoc-and-why-do-we-need-it
 *       /_intro.md
 *       /_reasons.md
 *       /...
 *
 * @param {ReturnType<typeof File>} layoutFile
 * @returns {Array<Promise<{ [key: string]: string }>>}
 */
const compileSections = (layoutFile) =>
  Directory()
    .setSource(
      path.dirname(
        layoutFile.source().replace(layoutsDirectory, contentsDirectory)
      )
    )
    .files()
    .filter((file) => {
      const fileName = path.basename(file.source());

      return fileName.startsWith('_') && fileName.endsWith(MD_SUFFIX);
    })
    .map(async (file) => ({
      [path.basename(file.source(), path.extname(file.source())).slice(1)]:
        await file.map(marked.parse).content()
    }));

/**
 * Compiles the page MD file for the given layout.
 * MD and Layout file must have the same basename and live in
 * the same of relatively similar directories.
 * That file may be absent, in that case an empty string is
 * returned.
 *
 * @param {ReturnType<typeof File>} layoutFile
 * @returns {Promise<string>}
 */
const compileContent = async (layoutFile) => {
  const contentFile = File().setSource(
    layoutFile
      .source()
      .replace(layoutsDirectory, contentsDirectory)
      .replace(LAYOUT_SUFFIX, MD_SUFFIX)
  );

  if (!contentFile.exists()) {
    return '';
  }

  return contentFile.map(marked.parse).content();
};
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
          scripts:
            '<script type="module" src="~/node_modules/postdoc/lib/assets/files/client/manager.js"></script>',
          content: await compileContent(file),
          sections: Object.assign(
            {},
            ...(await Promise.all(compileSections(file)))
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
