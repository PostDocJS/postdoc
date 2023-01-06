/**
 * @file Contains the public API of the Navigation
 *   functionality.
 *
 * @module client
 */

import {NavigationEventName, GLOBAL_MANAGER_NAME} from './constants.js';

/**
 * @typedef {Object} TransitionOptions
 * @property {boolean} [global]
 */

/**
 * Registers a *listener* to be invoked before leaving the
 * current page.
 *
 * Listener can be set either for the current page or globally
 * (on every page).
 *
 * @param {VoidFunction | (() => Promise<void>)} listener
 * @param {TransitionOptions} [options]
 * @returns {VoidFunction} A function that unregisters the *listener*.
 */
export const onLeave = (listener, {global = false} = {}) =>
  globalThis[GLOBAL_MANAGER_NAME][
    `register${global ? 'Global' : ''}EventListener`
  ](NavigationEventName.BeforeTransition, listener);

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
 * @param {VoidFunction | (() => Promise<void>)} listener
 * @param {TransitionOptions} [options]
 * @returns {VoidFunction} A function that removes the *listener*.
 */
export const onRender = (listener, {global = false} = {}) => {
  // After the very first page load it is likely that the
  // code in the *listener* should be executed.
  listener();

  return globalThis[GLOBAL_MANAGER_NAME][
    `register${global ? 'Global' : ''}EventListener`
  ](NavigationEventName.AfterTransition, listener);
};

/**
 * Starts the transition to the next page.
 *
 * @param {string} uri - The absolute URI of the next page.
 * @returns {Promise.<void>}
 */
export const navigateTo = (uri) =>
  globalThis[GLOBAL_MANAGER_NAME].navigate(uri);
