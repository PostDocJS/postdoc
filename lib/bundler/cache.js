/**
 * @file contains an implementation of the bundler's cache.
 *   It is substitution of the EJS's internal cache. It doesn't work now,
 *   because we replaced the `include` function with a custom one.
 *
 *   Cache is the Map where each key is points to the page's dependencies.
 *   Dependencies (partials) are includes, contents and sections.
 *
 *   There is no need to cache assets as it is Vite's responsibility.
 *
 * @module cache
 */

/** @type {Map<string, Map<string, unknown>>} */
const cache = new Map();

/**
 * @param {string} url
 * @returns {Map<string, unknown>}
 */
const createCacheFor = (url) => {
  cache.set(url, new Map());

  return cache.get(url);
};

/**
 * Returns a cache for the page.
 *
 * @param {string} url
 * @returns {Map<string, unknown>}
 */
exports.getCacheEntryFor = (url) => cache.has(url) ? cache.get(url) : createCacheFor(url); 

/**
 * Deletes a cache of the page.
 *
 * @param {string} url
 * @returns {boolean}
 */
exports.removeCacheEntry = (url) => cache.delete(url);

/**
 * Removes a dependency record from all caches.
 *
 * @param {string} path
 */
exports.removePartialFromCaches = (path) => Array.from(cache.values())
  .forEach((pageCache) => pageCache.delete(path));
