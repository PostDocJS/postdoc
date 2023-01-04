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

const {tap} = require('../utils/fp.js');
const {Stream} = require('../utils/stream.js');
const {Symbols} = require('../logger/symbols.js');
const {Container} = require('../utils/container.js');
const {Typography} = require('../logger/colors.js');
const {mergeFutures} = require('../utils/future.js');
const {Directory, File} = require('../files.js');
const {CONFIGURATION_ID} = require('../configuration/index.js');
const {createPageCompiler} = require('./page/index.js');
const {Pages, computePageURLOf} = require('./pages.js');
const {buildAssets, serveOutput} = require('./assets.js');
const {MessageBuilder, info, LineBuilder, Separator} = require('../logger/index.js');
const {
  removeCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts
} = require('./cache.js');
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

  const compilePage = createPageCompiler(allPages);

  const results = await mergeFutures(allPages.map(compilePage)).run();

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
 * @enum {string}
 * @readonly
 */
const FSEventType = {
  Add: 'fsevent-add',
  Change: 'fsevent-change',
  Remove: 'fsevent-remove'
};

/**
 * @typedef {Object} FSEvent
 * @property {string} file
 * @property {FSEventType} type
 */

/**
 * Removes the extension from the file's pathname.
 *
 * @param {string} fileUrl
 */
const withoutExtension = (fileUrl) => fileUrl.replace(path.extname(fileUrl), '');

/**
 * Looking at the dependency graph rebuilds either matched entities
 * or the whole project.
 *
 * @param {FSEvent} event 
 */
const rebuild = async ({type, file}) => {
  const pages = Pages();

  const compilePage = createPageCompiler(pages);

  if (file.endsWith(LAYOUT_SUFFIX) && (type === FSEventType.Add || type === FSEventType.Remove)) {
    MessageBuilder()
      .line(Separator.Empty)
      .line(
        LineBuilder()
          .text(Symbols.Diamond)
          .phrase('The')
          .phrase(Typography().bold(computePageURLOf(File().setSource(file))))
          .phrase(`page was ${FSEventType.Add ? 'added' : 'deleted'}. Rebuilding all pages...`)
          .build()
      )
      .pipe(info);

    await mergeFutures(pages.map(compilePage)).run();
  } else {
    const affectedPages = pages
      .filter(
        (page) =>
          page.layout.source() === file
          || page.content.source() === file
          || withoutExtension(page.script.source()) === withoutExtension(file)
          || withoutExtension(page.style.source()) === withoutExtension(file)
          || page.sections.some((section) => section.file.source() === file)
          || getCacheKeyDescriptorsByParts([page.layout.source(), file]).length > 0 
      );

    affectedPages.reduce(
      (builder, page) => builder.line(
        LineBuilder()
          .text('Rebuilding the')
          .phrase(Typography().bold.yellow(page.url))
          .phrase('page...')
          .padStart(2, Separator.Space)
          .build()
      ),
      MessageBuilder()
        .line(Separator.Empty)
        .line(
          LineBuilder()
            .text(Symbols.Diamond)
            .phrase('The')
            .phrase(Typography().bold(file.replace(process.cwd(), '')))
            .phrase(
              `file has been ${type === FSEventType.Add ? 'added' : type === FSEventType.Change ? 'changed' : 'removed'}.`
            )
            .build()
        )
    ).pipe(info);

    if (FSEventType.Change === type || FSEventType.Remove === type) {
      getCacheKeyDescriptorsByParts(file)
        .filter(descriptorShouldBeFor(file))
        .forEach(removeCacheEntry);
    }

    await mergeFutures(affectedPages.map(compilePage)).run();
  }
};

/**
 * Creates a stream that is automatically subscribed to `rebuild` function.
 *
 * @param {...Function} operators
 * @returns {import('../utils/stream.js').IStream<FSEvent>} 
 */
const createRebuildStream = (...operators) => {
  const stream = Stream(...operators);

  stream.forEach(rebuild);

  return stream;
};

/** Transformation stream for the MD files. */
const rebuildMarkdown = createRebuildStream(
  (event) => event.file.endsWith(MD_SUFFIX) ? event : undefined
);

/** Transformation stream for the EJS files. */
const rebuildEJS = () => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pagesDirectory = path.join(
    process.cwd(),
    configuration.directories.pages
  );

  return createRebuildStream(
    (event) => event.file.endsWith(EJS_SUFFIX) ? event : undefined,
    tap((event) => {
      if (event.type === FSEventType.Remove) {
        if (event.file.endsWith(LAYOUT_SUFFIX)) {
          File()
            .setSource(
              event.file
                .replace(pagesDirectory, temporalBuildDirectory)
                .replace(LAYOUT_SUFFIX, HTML_SUFFIX)
            )
            .remove()
            .run();

          getCacheKeyDescriptorsByParts(event.file)
            .forEach(removeCacheEntry);
        }
      }
    })
  );
};

/** 
 * A stream monitors if page's script was added or removed.
 * In those cases the page has to get rid of the script.
 */
const rebuildIfScriptChanged = createRebuildStream(
  (event) => event.file.endsWith(JS_SUFFIX) || event.file.endsWith(TS_SUFFIX) ? event : undefined,
  (event) => (event.type === FSEventType.Add || event.type === FSEventType.Remove)
    && File().setSource(event.file.replace(path.extname(event.file), LAYOUT_SUFFIX)).exists()
    ? event 
    : undefined
);

/** 
 * A stream monitors if page's style was added or removed.
 * In those cases the page has to get rid of the style link.
 */
const rebuildIfStyleChanged = createRebuildStream(
  (event) => event.file.endsWith(CSS_SUFFIX)
    || event.file.endsWith(SCSS_SUFFIX)
    || event.file.endsWith(SASS_SUFFIX)
    || event.file.endsWith(LESS_SUFFIX)
    || event.file.endsWith(STYLUS_SUFFIX)
    ? event
    : undefined,
  (event) => (event.type === FSEventType.Add || event.type === FSEventType.Remove)
    && File().setSource(event.file.replace(path.extname(event.file), LAYOUT_SUFFIX)).exists()
    ? event 
    : undefined
);

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

  changes.forEach(rebuildEJS());
  changes.forEach(rebuildMarkdown);
  changes.forEach(rebuildIfStyleChanged);
  changes.forEach(rebuildIfScriptChanged);

  const {restart} = await buildProject(true);

  // Watches for the layouts change.
  Directory()
    .setSource(pagesDirectory)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send({type: FSEventType.Add, file}))
    .on('change', (file) => changes.send({type: FSEventType.Change, file}))
    .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));

  // Watches for the includes change.
  Directory()
    .setSource(includesDirectory)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send({type: FSEventType.Add, file}))
    .on('change', (file) => changes.send({type: FSEventType.Change, file}))
    .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));

  if (pagesDirectory !== contentsDirectory) {
    // Watches for the contents change.
    Directory()
      .setSource(contentsDirectory)
      .recursive(true)
      .watch()
      .on('add', (file) => changes.send({type: FSEventType.Add, file}))
      .on('change', (file) => changes.send({type: FSEventType.Change, file}))
      .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));
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
