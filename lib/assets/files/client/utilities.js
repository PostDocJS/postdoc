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
 */
export const shortenSameSiteURI = (uri) =>
  isFullURL(uri)
    ? uri.startsWith(location.origin)
      ? new URL(uri).pathname
      : uri
    : uri;

/**
 * Returns full absolute string URL for a given location.
 * The order of creating the URL should be strict and conforms to the scheme below.
 * URI = scheme ":" ["//" authority] path ["?" query] ["#" fragment]
 *
 * @param {URL | Location} [source]
 * @returns {string}
 */
export const getUrl = (source = location) =>
  source.pathname + source.search + source.hash;