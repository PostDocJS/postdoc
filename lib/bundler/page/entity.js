/**
 * @file contains a definition of the *Page* entity.
 *
 * @module entity
 */

import {cwd} from 'node:process';
import {dirname, sep} from 'node:path';

import {Symbols} from '../../logger/symbols.js';
import {Typography} from '../../logger/colors.js';
import {Directory, File} from '../../files.js';
import {withURLSeparator} from '../../utils/url.js';
import {MD_SUFFIX, HTML_SUFFIX, EJS_SUFFIX} from '../../constants.js';
import {addCacheEntry, getCacheEntry, hasCacheEntry} from '../cache.js';
import {error, LineBuilder, MessageBuilder, Separator} from '../../logger/index.js';

/**
 * The entity that describes main parts of the static page.
 *
 * @typedef {Object} Page
 * @property {string} url - public URL of the page.
 * @property {string} [language] - a language of the page taken from the FS info.
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
 * @param {string} basename
 * @param {import('../../files.js').IDirectory} stopAt
 * @returns {import('../../files.js').IFile}
 */
const findLayoutIn = (directory, basename, stopAt) => {
  let layout;

  // Base case: If we've reached the stopAt directory or root directory, stop recursion
  if (!directory || directory.source() === stopAt.source()) {
    return layout;
  }

  if (directory.exists()) {
    const files = directory.files();

    layout = files.find(function (file) {
      return file.name() === `${basename}${EJS_SUFFIX}`;
    }) || files.find(function (file) {
      return file.name() === `index${EJS_SUFFIX}`;
    });
  }

  // If we found the layout, return it. Otherwise, recurse into the parent directory.
  return layout || findLayoutIn(directory.parent(), basename, stopAt);
};

/**
 * Collects all main files that belongs to one page.
 *
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 */
const createPageBuilder = function (configuration) {
  /**
   * @param {import('../../files.js').IFile} contentFile
   * @returns {Page}
   */
  return function (contentFile) {
    const {pages, layouts, output} = configuration.directories;

    const relativeLayoutDirectory = Directory(dirname(contentFile.source()).replace(pages, layouts));

    const contentFileName = contentFile.name().replace(contentFile.extension(), '');
    const layoutFile = findLayoutIn(relativeLayoutDirectory, contentFileName, Directory(configuration.directories.layouts));

    let outputFilePath = contentFile
      .source()
      .replace(pages, output)
      .replace(MD_SUFFIX, HTML_SUFFIX);

    const language = configuration.i18n.languages
      .find((language) => outputFilePath.includes(`${sep}${language}`));

    if (language) {
      outputFilePath = outputFilePath
        .replace(`${sep}${language}`, '')
        .replace(configuration.directories.output, `$&${sep}${language}`);
    }

    const outputFile = File(outputFilePath);
    const url = withURLSeparator(
      outputFile.source().replace(configuration.directories.output, '')
    );

    return {
      url,
      language,
      output: outputFile,
      layout: layoutFile,
      content: contentFile
    };
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
    .map(createPageBuilder(configuration))
    .filter(Boolean);

  const pagesWithoutLayout = pages.filter(function(page) {
    return !page.layout || !page.layout.exists();
  });

  if (pagesWithoutLayout.length) {
    MessageBuilder()
      .line(Separator.Empty)
      .line(
        LineBuilder()
          .text(Typography().red(Symbols.Cross))
          .phrase('Following pages does not have layouts:')
          .text(pagesWithoutLayout.map((page) => `\n  - ${Typography().dim(page.url)}`).join(''))
          .build()
      )
      .line(
        LineBuilder()
          .padStart(2, Separator.Space)
          .text('Create a default')
          .phrase(Typography().bold(`index${EJS_SUFFIX}`))
          .phrase('layout file at the root of the')
          .phrase(Typography().bold(configuration.directories.layouts.replace(cwd(), '~')))
          .phrase('directory.')
          .build()
      )
      .pipe(error);

    return pages.filter((page) => !pagesWithoutLayout.includes(page));
  }

  addCacheEntry(allPagesCacheDescriptor, pages);

  return pages;
};
