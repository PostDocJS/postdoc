/**
 * @file Contains the functionality for replacing the
 *   nodes of the current page with the new one.
 *   Describes a transition between pages.
 *
 * @module client_transition
 */

import {PAGE_MIME_TYPE} from './constants.js';
import {shortenSameSiteURI} from './utilities.js';

const pageParser = new DOMParser();

/**
 * Errors with the status code and page name.
 *
 * @param {string} page
 * @param {number} status
 */
const panicWith = (page, status) => {
  throw new Error(
    `The navigation to the "${page}" fails with "${status}" status.`
  );
};

/**
 * Creates the <script> element in the current `Document`
 * page context as a copy of the *reference* element.
 *
 * @param {HTMLScriptElement} reference - The element with
 *   the information needed for the new script.
 */
const copyScriptElement = (reference) => {
  const script = document.createElement('script');
  script.type = reference.type;
  script.src = shortenSameSiteURI(reference.src);
  return script;
};

/**
 * Fetches the page markup and replaces the current DOM
 * with the new one. Imitates the SPA functionality.
 *
 * A new page is parsed in its own Document context, so main
 * nodes are moved out of it and scripts are copied. Browsers
 * don't start loading scripts from contexts other than the current.
 *
 * @param {string} uri
 */
export const injectPage = (uri) =>
  fetch(uri, {
    headers: {
      Accept: PAGE_MIME_TYPE
    }
  })
    .then((response) =>
      response.ok ? response.text() : panicWith(uri, response.status)
    )
    .then((html) => {
      const page = pageParser.parseFromString(html, PAGE_MIME_TYPE);

      const head = document.adoptNode(page.head);
      const body = document.adoptNode(page.body);

      const headChildren = Array.from(head.children).map((element) =>
        element.tagName === 'SCRIPT' ? copyScriptElement(element) : element
      );
      const bodyChildren = Array.from(body.children).map((element) =>
        element.tagName === 'SCRIPT' ? copyScriptElement(element) : element
      );

      document.head.replaceChildren(...headChildren);
      document.body.replaceChildren(...bodyChildren);

      Array.from(body.attributes).forEach(({name, value}) =>
        document.body.setAttribute(name, value)
      );
      Array.from(page.documentElement.attributes).forEach(({name, value}) =>
        document.documentElement.setAttribute(name, value)
      );
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.error(error.message);
      }
    });
