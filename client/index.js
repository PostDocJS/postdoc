/**
 * @file Contains the public API of the Navigation
 *   functionality.
 *
 * @module client
 */

import './manager.js';
import {getUrl} from './utilities.js';
import {NavigationEventName, GLOBAL_MANAGER_NAME} from './constants.js';

/**
 * @typedef {Object} TransitionOptions
 * @property {RegExp | ((url: string) => boolean)} [forPage]
 */

/**
 * @callback TransitionHook
 * @param {URL} currentUrl - url on the current page
 * @param {URL} [nextUrl] - url to the next page in case of onLeave hook (optional)
 * @returns {void | Promise<void>}
 */

/**
 * Registers a *listener* to be invoked before leaving the
 * current page.
 *
 * Listener can be set either for the current page or globally
 * (on every page).
 *
 * @param {TransitionHook} listener
 * @param {TransitionOptions} [options]
 * @returns {VoidFunction} A function that deregisters the *listener*.
 */
export const onLeave = (listener, options = {}) =>
  globalThis[GLOBAL_MANAGER_NAME].registerEventListener(
    NavigationEventName.BeforeTransition,
    listener,
    options
  );

/**
 * Registers a *listener* to be invoked after rendering the
 * current page. It is the place to write the custom code
 * because the functionality will be preserved while navigating
 * from page to page.
 *
 * Listener can be set either for the current page or globally
 * (on every page).
 *
 * **The code outside this hook will be executed only on the first page render.**
 *
 * @param {TransitionHook} listener
 * @param {TransitionOptions} [options]
 * @returns {VoidFunction} A function that removes the *listener*.
 */
export const onRender = (listener, options = {}) => {
  const currentUrl = getUrl();
  const {forPage} = options;

  // After the very first page load it is likely that the
  // code in the *listener* should be executed.
  if (
    !forPage ||
    forPage instanceof RegExp && forPage.test(currentUrl.href) ||
    typeof forPage === 'function' && forPage(currentUrl)
  ) {
    listener(currentUrl);
  }

  return globalThis[GLOBAL_MANAGER_NAME].registerEventListener(
    NavigationEventName.AfterTransition,
    listener,
    options
  );
};

/**
 * Starts the transition to the next page.
 *
 * @param {string} uri - The absolute URI of the next page.
 * @returns {Promise.<void>}
 */
export const navigateTo = (uri) =>
  globalThis[GLOBAL_MANAGER_NAME].navigate(uri);
