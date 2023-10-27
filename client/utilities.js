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
 * Returns full absolute string URL for a given location.
 * The order of creating the URL should be strict and conforms to the scheme below.
 * URI = scheme ":" ["//" authority] path ["?" query] ["#" fragment]
 *
 * @param {URL | Location} [source]
 * @returns {string}
 */
export const getShortUrl = (source = location) =>
  source.pathname + source.search + source.hash;

/**
 * Extracts pathname from the *uri* if it has
 * the same origin with a current context.
 * Otherwise, does nothing.
 *
 * @param {string} uri
 * @returns {string}
 */
export const shortenSameSiteURI = (uri) =>
  isFullURL(uri)
    ? uri.startsWith(location.origin)
      ? getShortUrl(new URL(uri, location))
      : uri
    : uri;

/**
 * Returns full absolute URL for a given location.
 *
 * @param {string | Location} [source]
 * @returns {URL}
 */
export const getUrl = (source = location) =>
  typeof source === "string" ? new URL(source, location) : new URL(location);
