/*
 * @file contains implementation of the global API available in EJS files.
 *
 * @module global
 */

const path = require('path');
const process = require('process');

const {pipe} = require('../utils/fp.js');
const {File} = require('../files.js');
const {Container} = require('../utils/container.js');
const {resolveAPI} = require('./api.js');
const {Typography} = require('../logger/colors.js');
const {compileEjs} = require('./compile-ejs.js');
const {URL_DELIMITER} = require('../constants.js');
const {CONFIGURATION_ID} = require('../configuration/index.js');
const {hasCacheEntry, getCacheEntry, addCacheEntry} = require('./cache.js');
const {MessageBuilder, error: logError, LineBuilder, LocationLine} = require('../logger/index.js');

/**
 * @typedef {Object} PublicSectionInfo
 * @property {string} url
 * @property {string} name
 */

/**
 * @typedef {Object} PublicPageInfo
 * @property {string} url
 * @property {readonly PublicSectionInfo[]} sections
 */

/**
 * @typedef {Object} PublicLimitedPageInfo
 * @property {string} url
 */

/**
 * @typedef {PublicLimitedPageInfo} PublicExtendedPageInfo
 * @property {string} content
 * @property {Record<string, string>} sections
 */

/**
 * Creates a module `resolve` function for the custom _include_ pseudo global function.
 *
 * @param {import('../files.js').IFile} to
 * @param {string} includesDirectory
 * @returns {(includePath: string) => string}
 */
const createRelativeResolve = (to, includesDirectory) => (includePath) => {
  const normalizedIncludePath = path.normalize(includePath);

  const absolutePath = normalizedIncludePath.startsWith('~')
    ? normalizedIncludePath.replace('~', process.cwd())
    : path.resolve(
      includePath.startsWith('.') ? path.dirname(to.source()) : includesDirectory,
      normalizedIncludePath
    );

  if (path.extname(normalizedIncludePath) === '') {
    switch (true) {
      case File().setSource(absolutePath + '.ejs').exists(): return absolutePath + '.ejs'; 
      default: {
        MessageBuilder()
          .line(
            LineBuilder()
              .text('Cannot find a file following the')
              .phrase(Typography().bold(`${absolutePath.replace(process.cwd(), '~')}(.ejs)`))
              .text('path.')
              .build()
          )
          .line('Consider providing an extension or check if the path is valid.')
          .line(LocationLine(to))
          .map(Typography().red)
          .pipe(logError);

        process.exit(1);
      }
    }
  }

  return absolutePath;
}; 

/**
 * @param {import('../files.js').IFile} file
 * @returns {(modulePath: string) => string}
 */
const createEjsRequireResolve = (file) => (modulePath) => {
  const normalizedModulePath = path.normalize(modulePath);

  return modulePath.startsWith('.')
    ? path.resolve(path.dirname(file.source()), normalizedModulePath)
    : normalizedModulePath;
};

/** @param {import('../files.js').IFile} file */
const createEjsRequire = (file) => {
  const ejsRequireResolve = createEjsRequireResolve(file);

  return Object.assign(pipe(ejsRequireResolve, require), {resolve: ejsRequireResolve});
}; 

/**
 * @typedef {Object} GlobalAPIOptions
 * @property {import('../files.js').IFile} file
 * @property {import('./pages.js').Page} page
 * @property {Array<import('./pages.js').Page>} pages
 * @property {import('./cache.js').KeyDescriptor} descriptor Descriptor of the parent file.
 * @property {Object} [parentData]
 */

/**
 * Create a global API values for the current compiled file. 
 *
 * @param {GlobalAPIOptions} options
 */
const createGlobalAPI = ({
  file,
  page,
  pages,
  descriptor,
  parentData: {layoutContent = '', layoutSections = {}, ...parentData} = {}
}) => {
  const configuration = Container.get(CONFIGURATION_ID);

  const includesDirectory = path.resolve(configuration.directories.includes);

  const resolveRelative = createRelativeResolve(file, includesDirectory);

  return {
    ...parentData,
    /** An absolute path to the current directory. */
    __dirname: path.dirname(file.source()),
    /** An absolute path to the current file. */
    __filename: file.source(),
    /**
     * Loads a module into a current file. This is a port
     * of the CommonJS `require` function.
     *
     * @param {string} path
     * @returns {unknown}
     */
    require: createEjsRequire(file),
    /**
     * Returns a correct rebased url to the asset.  
     *
     * @param {string} pathToFile
     * @returns {string}
     */
    url: (pathToFile) => {
      const temporalOutputPath = page.temporaryOutput.source();

      const absolutePath = resolveRelative(pathToFile);

      const levelsUp = path.dirname(temporalOutputPath)
        .replace(process.cwd() + path.sep, '')
        .split(path.sep)
        .map(() => '..')
        .join(URL_DELIMITER);

      return absolutePath.replace(process.cwd(), levelsUp);
    },
    /**
     * This is a replacement for the built-in EJS `include` function.
     * It allows to preserve a relative point for each EJS file and build
     * correct global API. At the same time, it resembles the behaviour
     * of the original function.
     *
     * In future this function may be extended to work with non-EJS files.
     *
     * @param {string} includePath - a relative or absolute path to the file
     *   that has to be included into the current one.
     * @param {Object} [data] - an additional data that has to be globally
     *   available in the current file. Note, that that data will be available
     *   in the child includes also.
     * @returns {Promise<string>}
     */
    include: async (includePath, data = {}) => {
      const includeAbsolutePath = resolveRelative(includePath);

      const includeKeyDescriptor = descriptor.concat({file: includeAbsolutePath, data});

      if (hasCacheEntry(includeKeyDescriptor)) {
        return getCacheEntry(includeKeyDescriptor);
      }

      const includeFile = File().setSource(includeAbsolutePath);

      const wholeData = {layoutContent, layoutSections, ...parentData, ...data};

      return includeFile
        .content()
        .chain((content) =>
          compileEjs(
            content,
            createGlobalAPI({
              file: includeFile,
              page,
              pages,
              descriptor: includeKeyDescriptor,
              parentData: wholeData
            }),
            {filename: file.source()}
          )
        )
        .map((html) => {
          addCacheEntry(includeKeyDescriptor, html);

          return html;
        })
        .run()
        // Any errors was caught by `compileEjs` function so we can safely extract
        // the value here.
        .then(({extract}) => extract(() => '')); 
    },
    /**
     * Resolves, parses and structures an API data based on the
     * configuration's `directories.api` value.
     *
     * @returns {Promise<readonly import('./api.js').StructuredAPIFile[]>}
     */
    get api() { 
      return resolveAPI();
    },
    /**
     * Returns an information about the current page.
     * It always contains a current page's _url_ and for the
     * layout page there are page's _content_ and _sections_ properties.
     *
     * @type {PublicLimitedPageInfo | PublicExtendedPageInfo}
     */
    get page() {
      const base = {url: page.url};

      return page.layout === file
        ? {...base, content: layoutContent, sections: layoutSections}
        : base;
    },
    /**
     * Contains a list of all standalone project pages.
     *
     * @type {readonly PublicPageInfo[]}
     */
    pages: pages.map((page) => ({
      url: page.url,
      sections: page.sections.map(({name}) => ({
        name,
        url: page.url + '#' + name
      }))
    }))
  }; 
};

exports.createGlobalAPI = createGlobalAPI;
