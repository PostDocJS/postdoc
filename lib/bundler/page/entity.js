/**
 * @file contains a definition of the *Page* entity.
 *
 * @module entity
 */

import {dirname, basename, extname, join} from 'node:path';

import {not} from '../../utils/fp.js';
import {Directory, File} from '../../files.js';
import {withURLSeparator} from '../../utils/url.js';
import {MD_SUFFIX, HTML_SUFFIX, LAYOUT_SUFFIX} from '../../constants.js';
import {addCacheEntry, getCacheEntry, hasCacheEntry} from '../cache.js';

const IGNORE_REGEXPS = [
  // Vim's swap files.
  /\.sw[po]$/
];

/**
 * Signals whether a file or directory is safe to skip.
 *
 * @param {import('../../files.js').IFile|import('../../files.js').IDirectory} entity
 */
const isIgnored = (entity) =>
  IGNORE_REGEXPS.some((re) => re.test(entity.source()));

/**
 * Preserves intermediate directories of the layout pages source path.
 *
 * @param {string} source
 * @param {string} rootDirectory
 */
const preservePageDirectoryHierarchy = (source, rootDirectory) =>
  dirname(source).replace(rootDirectory, '');

/**
 * The description of the section file of a page.
 *
 * @typedef {Object} Section
 * @property {string} name
 * @property {import('../../files.js').IFile} file
 */

/**
 * The entity that describes main parts of the static page.
 *
 * @typedef {Object} Page
 * @property {string} url - public URL of the page.
 * @property {import('../../files.js').IFile} layout
 * @property {import('../../files.js').IFile} content
 * @property {Section[]} sections
 * @property {import('../../files.js').IFile} output
 */

/**
 * Checks whether the *file* is a section.
 *
 * @param {import('../../files.js').IFile} file
 */
const isSection = (file) => {
  const filePath = file.source();

  return (
    basename(filePath).startsWith('_') && filePath.endsWith(MD_SUFFIX)
  );
};

/**
 * Signals whether a file is a layout.
 *
 * @param {import('../../files.js').IFile} file
 */
const isLayout = (file) => file.source().endsWith(LAYOUT_SUFFIX);

/**
 * Creates a URL for the page file.
 *
 * @param {import('../../files.js').IFile} pageFile
 * @param {string} rootDirectory
 * @param {string} pageFileSuffix
 * @returns {string}
 */
export const computePageURLOf = (
  pageFile,
  rootDirectory,
  pageFileSuffix
) => withURLSeparator(
  pageFile
    .source()
    .replace(rootDirectory, '')
    .replace(pageFileSuffix, HTML_SUFFIX)
);

/**
 * Creates an output file for the page.
 *
 * @param {import('../../files.js').IFile} pageFile
 * @param {string} rootDirectory
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 * @param {string} pageFileSuffix
 * @returns {import('../../files.js').IFile}
 */
const createOutputFile = (
  pageFile,
  rootDirectory,
  configuration,
  pageFileSuffix
) => File(
  join(
    configuration.directories.output,
    preservePageDirectoryHierarchy(pageFile.source(), rootDirectory),
    basename(pageFile.source()).replace(pageFileSuffix, HTML_SUFFIX)
  )
);

/**
 * Collects all sections for a page.
 *
 * @param {import('../../files.js').IFile} contentFile
 * @returns {Section[]}
 */
const collectSections = (contentFile) =>
  Directory(dirname(contentFile.source()))
    .files()
    .filter(not(isIgnored))
    .filter(isSection)
    .map((section) => ({
      name: basename(section.source(), extname(section.source())).slice(1),
      file: section
    }));

/**
 * @param {import('../../files.js').IFile} layout
 * @param {import('../../configuration/defaults.js').Configuration} configuration
 * @returns {Page | Page[]}
 */
const createPage = (layout, configuration) => {
  const content = File(
    layout
      .source()
      .replace(
        configuration.directories.pages,
        configuration.directories.contents
      )
      .replace(LAYOUT_SUFFIX, MD_SUFFIX)
  );

  // If content doesn't exist, we try searching one level deep.
  // If content files are found, we assume that they are in different languages,
  // and it is the i18n case.
  if (!content.exists()) {
    const contentName = basename(content.source());

    const pages = Directory(dirname(content.source()))
      .directories()
      .filter(
        (directory) => directory.files().every(not(isLayout))
      )
      .map((directory) => {
        const content = File(join(directory.source(), contentName));
        const sections = collectSections(content);

        // If there is no content file and no sections, the directory
        // does not belong to the i18n and we have to skip it.
        if (!content.exists() && !sections.length) {
          return null;
        }

        const output = createOutputFile(
          content,
          configuration.directories.contents,
          configuration,
          MD_SUFFIX
        );

        const url = computePageURLOf(
          content,
          configuration.directories.contents,
          MD_SUFFIX
        );

        return {
          url,
          output,
          layout,
          content,
          sections
        };
      })
      .filter(Boolean);

    // If there are i18n pages, return them. Otherwise, proceed
    // to the classic approach.
    if (pages.length) {
      return pages; 
    }
  }

  const url = computePageURLOf(
    layout,
    configuration.directories.pages,
    LAYOUT_SUFFIX
  );

  return {
    url,
    layout,
    content,
    sections: basename(layout.source()).startsWith('index')
      ? collectSections(content)
      : [],
    output: createOutputFile(
      layout,
      configuration.directories.pages,
      configuration,
      LAYOUT_SUFFIX
    )
  };
};

export const allPagesCacheDescriptor = ['$$allPages'];

/**
 * Collects layouts from all levels into an array.
 * All layouts are transformed into the {@link Page} instances.
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
    .filter(isLayout)
    .flatMap((layout) => createPage(layout, configuration));

  addCacheEntry(allPagesCacheDescriptor, pages);

  return pages;
};
