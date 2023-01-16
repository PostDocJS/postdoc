/**
 * @file Contains the bundler's main functions.
 *   Bundler consists of the own EJS and MD compiler
 *   and the Vite as the post-process tool for compiled
 *   pages and assets like images, scripts, styles and other
 *   static files.
 *
 * @module bundler
 */

const {cwd} = require('process');
const {mkdtempSync} = require('fs');
const {dirname, join} = require('path');

const {Stream} = require('../utils/stream.js');
const {Symbols} = require('../logger/symbols.js');
const {Container} = require('../utils/container.js');
const {Typography} = require('../logger/colors.js');
const {Directory, File} = require('../files.js');
const {CONFIGURATION_ID} = require('../configuration/index.js');
const {createPageCompiler} = require('./page/index.js');
const {build, startServer} = require('./vite/index.js');
const {getAllPages, computePageURLOf} = require('./page/entity.js');
const {MessageBuilder, info, LineBuilder, Separator} = require('../logger/index.js');
const {
  MD_SUFFIX,
  EJS_SUFFIX,
  LAYOUT_SUFFIX
} = require('../constants.js');
const {
  removeCacheEntry,
  descriptorShouldBeFor,
  getCacheKeyDescriptorsByParts
} = require('./cache.js');

/** Builds a project. */
const buildProject = async () => {
  const configuration = Container.get(CONFIGURATION_ID);

  const temporaryDirectory = mkdtempSync(
    join(dirname(configuration.directories.output), '.pd-tmp-')
  );

  const allPages = getAllPages(configuration);

  const compile = createPageCompiler(allPages);

  const results = await Promise.all(allPages.map(async (page) => {
    const content = await compile(page);

    return File(
      page.output.source().replace(
        configuration.directories.output,
        temporaryDirectory
      )
    )
      .map(() => content)
      .write();
  }));

  await build(configuration, temporaryDirectory);

  await Directory(temporaryDirectory).remove();

  return results;
};

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
 * Looking at the dependency graph rebuilds either matched entities
 * or the whole project.
 *
 * @param {FSEvent} event 
 */
const rebuild = async ({type, file}) => {
  const configuration = Container.get(CONFIGURATION_ID);

  const pages = getAllPages(configuration);

  const compile = createPageCompiler(pages);

  let invalidatePages = pages;

  if (file.endsWith(LAYOUT_SUFFIX) && (type === FSEventType.Add || type === FSEventType.Remove)) {
    MessageBuilder()
      .line(Separator.Empty)
      .line(
        LineBuilder()
          .text(Symbols.Diamond)
          .phrase('The')
          .phrase(
            Typography().bold(
              computePageURLOf(File(file), configuration.directories.pages)
            )
          )
          .phrase(`page was ${type === FSEventType.Add ? 'added' : 'deleted'}. Rebuilding all pages...`)
          .build()
      )
      .pipe(info);

    getCacheKeyDescriptorsByParts(file)
      .forEach(removeCacheEntry);
  } else {
    const affectedPages = pages
      .filter(
        (page) =>
          page.layout.source() === file
          || page.content.source() === file
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
            .phrase(Typography().bold(file.replace(cwd(), '')))
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

    invalidatePages = affectedPages;
  }

  await Promise.all(invalidatePages.map(async (page) => {
    removeCacheEntry([page.output.source()]);

    return compile(page);
  }));
};

/**
 * Builds a project and continues watching for changes.
 * The built pages are available through the `localhost` and
 * local network.
 */
const serveProject = async () => {
  /** @type {import('../configuration/defaults.js').Configuration} */
  const configuration = Container.get(CONFIGURATION_ID);

  const changes = Stream(
    ({type, file}) => file.endsWith(EJS_SUFFIX) || file.endsWith(MD_SUFFIX)
      ? {type, file}
      : undefined
  );
  
  changes.forEach(rebuild);

  // Watches for the layouts change.
  Directory(configuration.directories.pages)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send({type: FSEventType.Add, file}))
    .on('change', (file) => changes.send({type: FSEventType.Change, file}))
    .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));

  // Watches for the includes change.
  Directory(configuration.directories.includes)
    .recursive(true)
    .watch()
    .on('add', (file) => changes.send({type: FSEventType.Add, file}))
    .on('change', (file) => changes.send({type: FSEventType.Change, file}))
    .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));

  if (configuration.directories.pages !== configuration.directories.contents) {
    // Watches for the contents change.
    Directory(configuration.directories.contents)
      .recursive(true)
      .watch()
      .on('add', (file) => changes.send({type: FSEventType.Add, file}))
      .on('change', (file) => changes.send({type: FSEventType.Change, file}))
      .on('unlink', (file) => changes.send({type: FSEventType.Remove, file}));
  }

  // Sets up the development server.
  await startServer(configuration);
};

exports.buildProject = buildProject;
exports.serveProject = serveProject;
