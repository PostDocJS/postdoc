/**
 * @file Contains helpers that are used throughout the client module.
 *
 * @module client_utilities
 */

/**
 * Checks whether the *uri* is the full-fledged URL.
 *
 * @param {string} uri
 */
const isFullURL = (uri) => {
  try {
    new URL(uri);

    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Extracts pathname from the *uri* if it has
 * the same origin with a current context.
 * Otherwise, does nothing.
 *
 * @param {string} uri
 * @returns {URL}
 */
export const shortenSameSiteURI = (uri) =>
  isFullURL(uri)
    ? uri.startsWith(location.origin)
      ? new URL(uri, location)
      : null
    : new URL(uri, location);

/**
 * Returns full absolute URL for a given location.
 *
 * @param {string | Location} [source]
 * @returns {URL}
 */
export const getUrl = (source = location) =>
  typeof source === 'string' ? new URL(source, location) : new URL(location);

/**
 * Returns short absolute url (pathname, search, hash) for a given location.
 *
 * @param {string | Element | URL | Location} [url]
 * @returns {string}
 */
export const getShortUrl = (url = location) => {
  const {pathname, search, hash} = typeof url === 'string' ? new URL(url, location) : url;

  return pathname + search + hash;
};