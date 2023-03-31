/**
 * @file contains a definition of the *Page* entity.
 *
 * @module entity
 */

import {dirname, join, sep} from 'node:path';

import {Directory, File} from '../../files.js';
import {withURLSeparator} from '../../utils/url.js';
import {MD_SUFFIX, HTML_SUFFIX, EJS_SUFFIX} from '../../constants.js';
import {addCacheEntry, getCacheEntry, hasCacheEntry} from '../cache.js';

/**
 * The entity that describes main parts of the static page.
 *
 * @typedef {Object} Page
 * @property {string} url - public URL of the page.
 * @property {import('../../files.js').IFile} layout
 * @property {import('../../files.js').IFile} content
 * @property {import('../../files.js').IFile} output
 */

/**
 * @param {import('../../files.js').IFile} file
 * @returns {boolean}
 */
export const isPartialFile = (file) => file.name().startsWith('_');

/**
 * @param {import('../../files.js').IFile} file
 * @returns {boolean}
 */
export const isPageFile = (file) => !isPartialFile(file) && file.extension() === MD_SUFFIX;

/**
 * @param {import('../../files.js').IDirectory} directory
 * @param {import('../../files.js').IDirectory} stopAt
 * @returns {import('../../files.js').IFile}
 */
const findLayoutIn = (directory, stopAt) => {
  if (!directory.exists()) {
    // TODO: show warning
    return File();
  }

  const layout = directory.files().find((file) => file.extension() === EJS_SUFFIX);

  return layout || (directory.source() === stopAt.source()
    ? File()
    : findLayoutIn(directory.parent(), stopAt));
};

/**
 * Collects all main files that belongs to one page.
 *
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 */
const createPageBuilder = (configuration) =>
  /**
   * @param {import('../../files.js').IFile} content
   * @returns {Page}
   */
  (content) => {
    const relativeLayoutDirectory = Directory(
      dirname(content.source()).replace(
        configuration.directories.pages,
        configuration.directories.layouts
      )
    );

    const layoutFile = findLayoutIn(relativeLayoutDirectory, Directory(configuration.directories.layouts));

    let outputFilePath = content
      .source()
      .replace(
        configuration.directories.pages,
        configuration.directories.output
      )
      .replace(MD_SUFFIX, HTML_SUFFIX);

    const language = configuration.i18n.languages
      .find((language) => outputFilePath.includes(`${sep}${language}`));

    if (language) {
      outputFilePath = join(sep, language, outputFilePath.replace(`${sep}${language}`, ''));
    }

    const outputFile = File(outputFilePath);

    const url = withURLSeparator(
      outputFile.source().replace(configuration.directories.output, '')
    );

    return {
      url,
      output: outputFile,
      layout: layoutFile,
      content
    };
  };

export const allPagesCacheDescriptor = ['$$allPages'];

/**
 * Collects content files from all levels into an array.
 * They are transformed into the {@link Page} instances.
 *
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 * @returns {Page[]}
 */
export const getAllPages = (configuration) => {
  if (hasCacheEntry(allPagesCacheDescriptor)) {
    return getCacheEntry(allPagesCacheDescriptor);
  }

  const pages = Directory(configuration.directories.pages)
    .recursive(true)
    .files()
    .filter(isPageFile)
    .flatMap(createPageBuilder(configuration));

  addCacheEntry(allPagesCacheDescriptor, pages);

  return pages;
};
