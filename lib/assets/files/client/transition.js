/**
 * @file Contains the functionality for replacing the
 *   nodes of the current page with the new one.
 *   Describes a transition between pages.
 *
 * @module client_transition
 */

import udomdiff from 'udomdiff';

import {PAGE_MIME_TYPE} from './constants.js';

const pageParser = new DOMParser();

/**
 * Fetches the page markup and replaces the current DOM
 * with the new one. Imitates the SPA functionality.
 *
 * A new page is parsed in its own Document context, so main
 * nodes are moved out of it and scripts are copied. Browsers
 * don't start loading scripts from contexts other than the current.
 *
 * @param {string} url
 */
export const startTransition = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: PAGE_MIME_TYPE
    }
  });

  const html = await response.text();

  const nextNodes = pageParser
    .parseFromString(html, PAGE_MIME_TYPE)
    .documentElement.childNodes;

  udomdiff(
    document.documentElement,
    Array.from(document.documentElement.childNodes),
    Array.from(nextNodes),
    (node) => node
  );
};
