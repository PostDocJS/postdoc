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

const {build} = require('./page/index.js');
const {Stream} = require('../utils/stream.js');
const {Option} = require('../utils/option.js');
const {Container} = require('../utils/container.js');
const {mergeResults} = require('../utils/result.js');
const {Directory, File} = require('../files.js');
const {CONFIGURATION_ID} = require('../configuration/index.js');
const {Pages, PublicApiOf} = require('./pages.js');
const {Succeed, mergeFutures} = require('../utils/future.js');
const {buildAssets, serveOutput} = require('./assets.js');
const {
  JS_SUFFIX,
  TS_SUFFIX,
  MD_SUFFIX,
  EJS_SUFFIX,
  CSS_SUFFIX,
  SCSS_SUFFIX,
  SASS_SUFFIX,
  LESS_SUFFIX,
  HTML_SUFFIX,
  STYLUS_SUFFIX,
  LAYOUT_SUFFIX,
  BUILD_TEMPORAL_DIRECTORY
} = require('../constants.js');

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
 * Removes the extension from the file's pathname.
 *
 * @param {string} fileUrl
 */
const withoutExtension = (fileUrl) => fileUrl.replace(path.extname(fileUrl), '');

/**
 * Searches for a page based on the FS *path*.
 * *path* can be the page's layout, content, script file
 * style file or one of the sections.
 *
 * @param {string} path
 * @param {import('./pages.js').Page[]} all
 * @returns {Option<import('./pages.js').Page>}
 */
const getPage = (path, all) =>
  Option(all.find(
    (page) =>
      page.layout.source() === path
      || page.content.source() === path
      || withoutExtension(page.script.source()) === withoutExtension(path)
      || withoutExtension(page.style.source()) === withoutExtension(path)
      || page.sections.some((section) => section.file.source() === path)
  ));

/**
 * Rebuilds the page if the *filePath* is a path
 * or rebuilds all pages if the *filePath* is the `null`.
 *
 * @param {string|null} filePath
 */
const rebuild = async (filePath) => {
  const pages = Pages();

  const buildPageWithAPI = build(PublicApiOf(pages));

  if (filePath === null) {
    await mergeFutures(pages.map(buildPageWithAPI)).run();
  } else {
    await getPage(filePath, pages)
      .map(buildPageWithAPI)
      .extract(Succeed)
      .run();
  }
};

/** Transformation stream for the MD files. */
const MDStream = () => {
  const stream = Stream(
    ([_event, file]) => file.endsWith(MD_SUFFIX) ? file : undefined
  );

  stream.forEach(rebuild);

  return stream;
};

/** Transformation stream for the EJS files. */
const EJSStream = () => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pagesDirectory = path.join(
    process.cwd(),
    configuration.directories.pages
  );

  const stream = Stream(
    ([event, file]) => file.endsWith(EJS_SUFFIX) ? [event, file] : undefined,
    ([event, file]) => event === 'remove' && file.endsWith(LAYOUT_SUFFIX)
      ? void (File()
        .setSource(
          file
            .replace(pagesDirectory, temporalBuildDirectory)
            .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
        )
        .remove()
        .run())
      : file,
    (file) => file.endsWith(LAYOUT_SUFFIX) ? file : null
  );

  stream.forEach(rebuild);

  return stream;
};

/** Transformation stream for the scripts. */
const ScriptStream = () => {
  const stream = Stream(
    ([event, file]) => file.endsWith(JS_SUFFIX) || file.endsWith(TS_SUFFIX) ? [event, file] : undefined,
    ([event, file]) => (event === 'add' || event === 'remove')
      && File().setSource(file.replace(path.extname(file), LAYOUT_SUFFIX)).exists()
      ? file
      : undefined
  );

  stream.forEach(rebuild);

  return stream;
};

/** Transformation stream for the styles. */
const StyleStream = () => {
  const stream = Stream(
    ([event, file]) => file.endsWith(CSS_SUFFIX)
      || file.endsWith(SCSS_SUFFIX)
      || file.endsWith(SASS_SUFFIX)
      || file.endsWith(LESS_SUFFIX)
      || file.endsWith(STYLUS_SUFFIX)
      ? [event, file]
      : undefined,
    ([event, file]) => (event === 'add' || event === 'remove')
      && File().setSource(file.replace(path.extname(file), LAYOUT_SUFFIX)).exists()
      ? file
      : undefined
  );

  stream.forEach(rebuild);

  return stream;
};

/**
 * Builds a project and continues watching for changes.
 * The built pages are available through the `localhost` and
 * local network.
 */
const buildIncrementally = async () => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pagesDirectory = path.join(
    process.cwd(),
    configuration.directories.pages
  );

  const contentsDirectory = path.join(
    process.cwd(),
    configuration.directories.contents || configuration.directories.pages
  );

  const includesDirectory = path.join(
    process.cwd(),
    configuration.directories.includes
  );

  const changes = Stream();

  changes.forEach(MDStream());
  changes.forEach(EJSStream());
  changes.forEach(ScriptStream());
  changes.forEach(StyleStream());

  const {restart} = await buildProject(true);

  // Watches for the layouts change.
  Directory()
    .setSource(pagesDirectory)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send(['add', file]))
    .on('change', (file) => changes.send(['change', file]))
    .on('unlink', (file) => changes.send(['remove', file]));

  // Watches for the includes change.
  Directory()
    .setSource(includesDirectory)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send(['add', file]))
    .on('change', (file) => changes.send(['change', file]))
    .on('unlink', (file) => changes.send(['remove', file]));

  if (pagesDirectory !== contentsDirectory) {
    // Watches for the contents change.
    Directory()
      .setSource(contentsDirectory)
      .recursive(true)
      .watch()
      .on('add', (file) => changes.send(['add', file]))
      .on('change', (file) => changes.send(['change', file]))
      .on('unlink', (file) => changes.send(['remove', file]));
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
