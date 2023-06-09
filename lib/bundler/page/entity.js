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
import {addCacheEntry, getCacheEntry, hasCacheEntry} from '../cache.js';
import {error, LineBuilder, MessageBuilder, Separator} from '../../logger/index.js';
import {MD_EXTENSION, HTML_EXTENSION, EJS_EXTENSION, LAYOUT_EXTENSION} from '../../constants.js';

/**
 * The entity that describes main parts of the static page.
 *
 * @typedef {Object} Page
 * @property {string} url - public URL of the page.
 * @property {boolean} isMD
 * @property {string} [language] - a language of the page taken from the FS info.
 * @property {import('../../files.js').IFile} layout
 * @property {import('../../files.js').IFile} content
 * @property {import('../../files.js').IFile} output
 */

/**
 * @param {import('../../files.js').IFile} file
 * @returns {boolean}
 */
export const isPartial = (file) => file.name().startsWith('_');

/**
 * Checks whether the file's source is a layout file.
 *
 * @param {import('../../files.js').IFile} file
 * @returns {boolean}
 */
const isLayout = (file) =>
  !isPartial(file)
    && file.name().endsWith(LAYOUT_EXTENSION);

/**
 * @param {import('../../files.js').IFile} file
 * @returns {boolean}
 */
export const isPage = (file) =>
  !isPartial(file)
    && !isLayout(file)
    && (file.extension() === MD_EXTENSION || file.extension() === EJS_EXTENSION);

/**
 * @param {import('../../files.js').IDirectory} directory
 * @param {string} basename
 * @param {import('../../files.js').IDirectory} stopAt
 * @returns {import('../../files.js').IFile}
 */
const findLayoutIn = (directory, basename, stopAt) => {
  let layout;

  if (directory.exists()) {
    const files = directory.files();

    layout = files.find((file) => file.name() === `${basename}${LAYOUT_EXTENSION}`)
      || files.find((file) => file.name() === `index${LAYOUT_EXTENSION}`);
  }

  return layout || (directory.source() === stopAt.source()
    ? File()
    : findLayoutIn(directory.parent(), basename, stopAt));
};

/**
 * Collects all main files that belongs to one page.
 *
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 */
const createPageBuilder = (configuration) =>
  /**
   * @param {import('../../files.js').IFile} contentFile
   * @returns {Page}
   */
    (contentFile) => {
    const relativeLayoutDirectory = Directory(
      dirname(contentFile.source()).replace(
        configuration.directories.pages,
        configuration.directories.layouts
      )
    );

    const layoutFile = findLayoutIn(
      relativeLayoutDirectory,
      contentFile.name().replace(contentFile.extension(), ''),
      Directory(configuration.directories.layouts)
    );

    let outputFilePath = contentFile
      .source()
      .replace(
        configuration.directories.pages,
        configuration.directories.output
      )
      .replace(MD_EXTENSION, HTML_EXTENSION)
      .replace(EJS_EXTENSION, HTML_EXTENSION);

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
      isMD: contentFile.extension() === MD_EXTENSION,
      language,
      output: outputFile,
      layout: layoutFile,
      content: contentFile
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
    .filter(isPage)
    .map(createPageBuilder(configuration))
    .filter(Boolean);

  const pagesWithoutLayout = pages.filter((page) => !page.layout.exists());

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
          .phrase(Typography().bold(`index${LAYOUT_EXTENSION}`))
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
