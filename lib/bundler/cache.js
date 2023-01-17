/**
 * @file contains an implementation of the bundler's cache.
 *   It is substitution of the EJS's internal cache. It doesn't work now,
 *   because we replaced the `include` function with a custom one.
 *
 *   Cache is the Map where each key points to a compiled content of some file.
 *   That file may or may not consist of other files. If the file is compound,
 *   any change in that file invalidate it and all files which uses the file up
 *   to the page layout. All files below the changed one won't be revalidated.
 *   
 *   File can contain some data to be rendered with (by using `include` function).
 *   The data will be stringified and included into the key as a salt. That ensures
 *   that the same file with different data will create different cache entries.
 *
 *   There is no need to cache assets as it is Vite's responsibility.
 *
 * @module cache
 */

const FILE_DELIMITER = '#|#';
const DATA_DELIMITER_START = '|[|';
const DATA_DELIMITER_END = '|]|';

/** @type {Map<string, string | [import('./page/front-matter.js').Meta | null, string]>} */
const cache = new Map();

/**
 * @typedef {Object} FileDescriptorWithData
 * @property {string} file
 * @property {Object} data
 */

/**
 * @typedef {string | FileDescriptorWithData} KeyDescriptorPart
 */

/**
 * @typedef {Array<KeyDescriptorPart>} KeyDescriptor
 */

/**
 * Generates a key from a given descriptor.
 *
 * @param {KeyDescriptor} descriptor
 */
const generateKey = (descriptor) => descriptor.reduce(
  (accumulator, part) => {
    const prefix = accumulator === '' ? '' : accumulator + FILE_DELIMITER;

    return prefix + (typeof part === 'string'
      ? part
      : part.file
        + DATA_DELIMITER_START
        + JSON.stringify(part.data)
        + DATA_DELIMITER_END);
  },
  ''
);

/**
 * Checks if a part is the file which a descriptor points to.
 * If the part is an object, then descriptor should point to
 * the entry with data includes as a key. That means the function
 * checks for precise match.
 *
 * @param {KeyDescriptorPart} part
 * @returns {(descriptor: KeyDescriptor) => boolean}
 */
export const descriptorShouldBeFor = (part) => (descriptor) => {
  const key = generateKey([part]);
  const lastKeyPart = descriptor[descriptor.length - 1];

  return typeof lastKeyPart === 'string'
    ? lastKeyPart === key
    : lastKeyPart.file === key; 
}; 

/**
 * Searches for all keys in the cache that include provided _parts_.
 *
 * @param {KeyDescriptorPart | KeyDescriptor} parts
 * @returns {Array<KeyDescriptor>}
 */
export const getCacheKeyDescriptorsByParts = (parts) => {
  const partialKeyDescriptor = Array.isArray(parts) ? parts : [parts];

  return Array.from(cache.keys())
    .filter(
      (key) => partialKeyDescriptor.every(
        (keyPart) => typeof keyPart === 'string'
          ? key.includes(keyPart)
          : key.includes(generateKey([keyPart]))
      )
    )
    .map((key) => key
      .split(FILE_DELIMITER)
      .map((part) => {
        if (part.includes(DATA_DELIMITER_START)) {
          const temporaryDelimiter = '-|-';

          const [file, data] = part
            .replace(DATA_DELIMITER_START, temporaryDelimiter)
            .replace(DATA_DELIMITER_END, temporaryDelimiter)
            .split(temporaryDelimiter);

          return {file, data: JSON.parse(data)};
        }

        return part;
      })
    );
}; 

/**
 * Checks if the cache has an entry by a key descriptor.
 *
 * @param {KeyDescriptor} keyDescriptor
 */
export const hasCacheEntry = (keyDescriptor) =>
  cache.has(generateKey(keyDescriptor));

/**
 * Tries to get an entry from the cache.
 *
 * @param {KeyDescriptor} keyDescriptor
 */
export const getCacheEntry = (keyDescriptor) =>
  cache.get(generateKey(keyDescriptor));

/**
 * Inserts an entry to the cache.
 *
 * @param {KeyDescriptor} keyDescriptor
 * @param {string} content
 */
export const addCacheEntry = (keyDescriptor, content) => {
  cache.set(generateKey(keyDescriptor), content);
};

/**
 * Removes the current entry described by the descriptor
 * and all files that contain it.
 *
 * @param {KeyDescriptor} keyDescriptor
 */
export const removeCacheEntry = (keyDescriptor) =>
  keyDescriptor
    .reduce(
      (accumulator, _, index, keyDescriptor) =>
        accumulator.concat(generateKey(keyDescriptor.slice(0, index + 1))),
      []
    )
    .forEach((key) => cache.delete(key));

/**
 * Clears the cache.
 *
 * @type {VoidFunction}
 */
export const clearCache = cache.clear.bind(cache);
