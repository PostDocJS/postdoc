/*
 * @file contains implementation of the global API available in EJS files.
 *
 * @module global
 */

import {pathToFileURL} from 'node:url';
import {env, cwd, exit} from 'node:process';
import {builtinModules, createRequire} from 'node:module';
import {
  sep,
  resolve,
  dirname,
  extname,
  relative,
  normalize,
  isAbsolute
} from 'node:path';

import {File} from '../files.js';
import {pipe} from '../utils/fp.js';
import {Container} from '../utils/container.js';
import {Typography} from '../logger/colors.js';
import {compileEjs} from './page/compile-ejs.js';
import {compileMarkdown} from './page/compile-markdown.js';
import {CONFIGURATION_ID, createConfig} from '../configuration/index.js';
import {EJS_EXTENSION, MD_EXTENSION, URL_DELIMITER} from '../constants.js';
import {hasCacheEntry, getCacheEntry, addCacheEntry} from './cache.js';
import {
  LineBuilder,
  LocationLine,
  MessageBuilder,
  error as logError
} from '../logger/index.js';

/**
 * @typedef {Object} PublicSectionInfo
 * @property {string} url
 * @property {string} name
 */

/**
 * @typedef {Object} PublicPageInfo
 * @property {string} url
 * @property {string} language
 */

/**
 * @typedef {Object} PublicLimitedPageInfo
 * @property {string} url
 * @property {string} language
 */

/**
 * @typedef {PublicLimitedPageInfo} PublicExtendedPageInfo
 * @property {string} content
 */

/**
 * @callback Resolver
 * @param {string} path
 * @returns {string}
 */

/**
 * Creates a basic resolver which imitates the Node resolving algorithm.
 * But it allows to provide a directory for packages to search.
 *
 * @param {string} currentPoint absolute path of the file for relative paths.
 * @param {string} [commonDirectory] a relative to the CWD directory where it
 * 	should try searching ambiguous paths.
 * @returns {Resolver} resolver.
 */
const createBasicResolver = (currentPoint, commonDirectory) => (path) =>
  builtinModules.includes(path)
    ? path
    : path.startsWith('.')
      ? resolve(dirname(currentPoint), normalize(path))
      : commonDirectory
        ? resolve(commonDirectory, normalize(path))
        : normalize(path);

/**
 * Creates a `resolve` function for the EJS and MD environments.
 *
 * @param {Resolver} resolver
 * @returns {Resolver}
 */
const createPostDocResolver = (resolver) => (path) => {
  const normalizedPath = normalize(path);

  return normalizedPath.startsWith('~')
    ? normalizedPath.replace('~', cwd())
    : resolver(path);
};

/**
 * @param {string} path
 * @returns {string | URL}
 */
const convertPathToFileUrlIfNeeded = (path) =>
  builtinModules.includes(path)
    ? path
    : isAbsolute(path)
      ? pathToFileURL(path)
      // Most likely this is a package name that should be provided as is.
      : path;

/**
 * @typedef {Object} GlobalAPIOptions
 * @property {import('../files.js').IFile} file
 * @property {import('./page/entity.js').Page} page
 * @property {Array<import('./page/entity.js').Page>} pages
 * @property {import('./cache.js').KeyDescriptor} descriptor Descriptor of the parent file.
 * @property {Object} [parentData]
 */

/**
 * Create a global API values for the current compiled file. 
 *
 * @param {GlobalAPIOptions} options
 */
export const createGlobalAPI = ({
  file,
  page,
  pages,
  descriptor,
  parentData: {layoutContent, frontMatter = {}, ...parentData} = {}
}) => {
  /** @type {import('../configuration/defaults.js').Configuration} */
  const configuration = Container.get(CONFIGURATION_ID);

  const {i18n, directories: {includes}} = configuration;
  const postDocResolve = createPostDocResolver(
    createBasicResolver(file.source(), includes)
  );

  const Config = createConfig(configuration);

  return {
    ...parentData,
    /** An absolute path to the current directory. */
    __dirname: dirname(file.source()),
    /** An absolute path to the current file. */
    __filename: file.source(),
    /**
     * Loads a CJS module and JSON into a current file. This is a port
     * of the CommonJS `require` function.
     *
     * @param {string} path
     * @returns {unknown}
     */
    require: createRequire(pathToFileURL(file.source())),
    /**
     * Loads ESM modules into a current file. This is a shim
     * for the native asynchronous import. 
     *
     * Native asynchronous import doesn't care about the file's
     * location, instead in tries to locate path relatively
     * to the actual execution in `ejs` package.
     *
     * @param {string} path
     * @returns {unknown}
     */
    import$: pipe(
      createBasicResolver(file.source()),
      convertPathToFileUrlIfNeeded,
      (path) => import(path)
    ),
    /**
     * Returns a correct rebased url to the asset.  
     *
     * @param {string} pathToFile
     * @returns {string}
     */
    url: (pathToFile) => {
      const outputPath = page.output.source();

      const absolutePath = postDocResolve(pathToFile);

      return relative(dirname(outputPath), absolutePath)
        .split(sep)
        .join(URL_DELIMITER);
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
      let includeAbsolutePath = postDocResolve(includePath);

      if (extname(includeAbsolutePath) === '') {
        switch (true) {
          case File(includeAbsolutePath + EJS_EXTENSION).exists():
            includeAbsolutePath += EJS_EXTENSION;
            break;
          case File(includeAbsolutePath + MD_EXTENSION).exists():
            includeAbsolutePath += MD_EXTENSION;
            break;
          default: {
            MessageBuilder()
              .line(
                LineBuilder()
                  .text('Cannot find a file following the')
                  .phrase(Typography().bold(`${includeAbsolutePath.replace(cwd(), '~')}.(ejs|md)`))
                  .text('path.')
                  .build()
              )
              .line('Consider providing an extension or check if the path is valid.')
              .line(LocationLine(file))
              .map(Typography().red)
              .pipe(logError);

            exit(1);
          }
        }
      }

      const includeKeyDescriptor = descriptor.concat({file: includeAbsolutePath, data});

      if (hasCacheEntry(includeKeyDescriptor)) {
        return getCacheEntry(includeKeyDescriptor);
      }

      const wholeData = {layoutContent, frontMatter, ...parentData, ...data};

      const includeFile = File(includeAbsolutePath);

      let html = await compileEjs(
        await includeFile.content(),
        createGlobalAPI({
          file: includeFile,
          page,
          pages,
          descriptor: includeKeyDescriptor,
          parentData: wholeData
        }),
        {
          filename: file.source(),
          Config
        }
      );

      if (includeFile.extension() === MD_EXTENSION) {
        html = await compileMarkdown(html, {filename: includeFile.source(), withFrontMatter: false});
      }

      addCacheEntry(includeKeyDescriptor, html);

      return html;
    },
    /**
     * Returns an information about the current page.
     * It always contains a current page's _url_ and for the
     * layout page there are page's _content_ and _sections_ properties.
     *
     * @type {PublicLimitedPageInfo | PublicExtendedPageInfo}
     */
    get page() {
      const language = frontMatter.language || page.language || i18n.defaultLanguage;
      
      const base = {...frontMatter, language, url: page.url};

      return page.layout === file
        ? {...base, content: layoutContent}
        : base;
    },
    /**
     * Contains a list of all standalone project pages.
     *
     * @type {readonly PublicPageInfo[]}
     */
    pages: pages.map((page) => ({
      url: page.url,
      language: page.language || i18n.defaultLanguage
    })),
    /**
     * Contains information about environment. 
     */
    meta: {
      mode: env.MODE
    }
  };
};
