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

const executedScriptsUrls = new Set();

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
  const element = document.createElement('script');

  Array.from(reference.attributes).forEach(({name, value}) => {
    element.setAttribute(
      name,
      name === 'src' ? shortenSameSiteURI(value).href : value
    );
  });

  element.append(
    document.createTextNode(reference.textContent)
  );

  return element;
};

const waitUntilLoaded = (node) => {
  let finishedStyleLoading;

  const promise = new Promise((resolve) => (finishedStyleLoading = resolve));

  node.addEventListener('load', function onLoad() {
    finishedStyleLoading();
    node?.removeEventListener('load', onLoad);
  });

  node.addEventListener('error', function onError() {
    // TODO?
    node?.removeEventListener('error', onError);
  });

  return promise;
};

const walk = (root, callback, level = 'deep') => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  let node;
  // eslint-disable-next-line no-cond-assign
  while (node = walker.nextNode()) {
    if (level === 'deep') {
      callback(node);
    } else if (root === node.parentNode) {
      callback(node);
    }
  }
};

const splitHeadTags = (head) => {
  const styles = [];
  const scripts = [];
  const others = [];

  walk(head, (node) => {
    if (isStylesheetNode(node)) {
      styles.push(node);
    } else if (node.tagName === 'SCRIPT') {
      prepareNewScriptNode(node, (node) => scripts.push(node));
    } else {
      if (node.tagName === 'NOSCRIPT') {
        // For some reason if noscript contains a markup it is parsed also
        // but it should not be. With this we make sure inner markup stays as string.
        node.textContent = node.innerHTML;
      }

      others.push(node);
    }
  }, 'shallow');

  return [
    styles,
    scripts,
    others
  ];
};

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isPreconnectNode = (node) => node.tagName === 'LINK' && node.rel === 'preconnect';

/**
 * @param {Node} node
 * @returns {boolean}
 */
const isStylesheetNode = (node) => node.tagName === 'LINK' && node.rel === 'stylesheet';

const prepareNewScriptNode = (node, callback, clean) => {
  const nodeSrc = node.getAttribute('src');

  if (nodeSrc && !executedScriptsUrls.has(nodeSrc)) {
    executedScriptsUrls.add(nodeSrc);

    callback(copyScriptElement(node));
  } else if (!nodeSrc) {
    callback(copyScriptElement(node));
  } else {
    clean?.(node);
  }
};

const findAndPreserveOldNodeIf = (condition, oldHeadNodes) =>
  (oldNode, index) => {
    if (!oldNode) {
      return false;
    }

    const result = condition(oldNode);

    if (result) {
      oldHeadNodes[index] = null;
    }

    return result;
  };

const extractScriptsFrom = (root) => {
  const scriptsReplacements = [];

  walk(root, (node) => {
    if (node.tagName === 'SCRIPT') {
      prepareNewScriptNode(
        node,
        (preparedNode) => scriptsReplacements.push(() => node.replaceWith(preparedNode)),
        (node) => scriptsReplacements.push(() => node.remove())
      );
    }
  });

  return [root, scriptsReplacements];
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
export const startTransition = (uri) => {
  // First page load
  const isFirstLoad = !executedScriptsUrls.size;

  if (isFirstLoad) {
    const oldScripts = document.querySelectorAll('script[src]');

    oldScripts.forEach((script) => executedScriptsUrls.add(script.getAttribute('src')));
  }

  return fetch(uri, {
    headers: {
      Accept: PAGE_MIME_TYPE
    }
  })
    .then((response) =>
      response.ok ? response.text() : panicWith(uri, response.status)
    )
    .then(async (html) => {
      const page = pageParser.parseFromString(html, PAGE_MIME_TYPE);

      const head = document.adoptNode(page.head);
      const body = document.adoptNode(page.body);

      const [styles, scripts, others] = splitHeadTags(head);

      const oldHeadNodes = [...document.head.children];

      const pendingStyles = styles
        .filter((node) => !oldHeadNodes.some(
          findAndPreserveOldNodeIf((oldNode) => isStylesheetNode(oldNode) && node.href === oldNode.href, oldHeadNodes)
        ));

      document.head.append(...pendingStyles);

      await Promise.all(pendingStyles.map(waitUntilLoaded));

      Array.from(document.documentElement.attributes).forEach(({name}) => {
        const valueFromNextPage = page.documentElement.getAttribute(name);

        if (valueFromNextPage !== null) {
          document.documentElement.setAttribute(name, valueFromNextPage);
          page.documentElement.removeAttribute(name);
        } else {
          document.documentElement.removeAttribute(name);
        }
      });
      Array.from(page.documentElement.attributes).forEach(({name, value}) =>
        document.documentElement.setAttribute(name, value)
      );

      document.head.append(
        ...scripts,
        ...others.filter((node) =>
          !(
            isPreconnectNode(node) &&
            oldHeadNodes.some(
              findAndPreserveOldNodeIf((oldNode) => isPreconnectNode(oldNode) && node.href === oldNode.href, oldHeadNodes)
            )
          )
        )
      );

      const [walkedBody, deferredBodyScriptsReplacements] = extractScriptsFrom(body);

      document.body.replaceWith(walkedBody);

      deferredBodyScriptsReplacements.forEach((replace) => replace());

      oldHeadNodes.forEach((node) => {
        if (node) {
          node.remove();
        }
      });
    });
};