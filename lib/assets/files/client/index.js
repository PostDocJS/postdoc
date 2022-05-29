/**
 * @file Contains the public API of the Navigation
 *   functionality.
 *
 * @module client
 */

import {shortenSameSiteURI} from './utilities.js';
import {NavigationEventName, GLOBAL_MANAGER_NAME} from './constants.js';

/**
 * @template {HTMLElement} T
 * @template {Event} E
 *
 * @this {T}
 * @callback NavigationEventListener
 * @param {E} event
 * @returns {void}
 */

/**
 * Adds an event listener to the element on the page.
 * This function reflects the `element.addEventListener` behaviour with
 * the respect to the PostDoc Navigation module.
 * Returns a function witch removes the listener from the element.
 *
 * @template {keyof HTMLElementTagNameMap} S
 * @template {keyof HTMLElementEventMap} E
 * @param {S} selectors - CSS selectors that describes the element.
 * @param {E} name - The event's name.
 * @param {NavigationEventListener<HTMLElementTagNameMap[S], HTMLElementEventMap[E]>} listener
 * @returns {VoidFunction}
 */
export const attachListener = (selectors, name, listener) => {
  document.querySelector(selectors)?.addEventListener(name, listener);

  const detachListener = window[GLOBAL_MANAGER_NAME].registerEventListener(
    NavigationEventName.AfterTransition,
    () => document.querySelector(selectors)?.addEventListener(name, listener)
  );

  return () => {
    document.querySelector(selectors)?.removeEventListener(name, listener);
    detachListener();
  };
};

/**
 * Adds an event listener to all elements on the page.
 * This function reflects the `element.addEventListener` behaviour with
 * the respect to the PostDoc Navigation module.
 * Returns a function witch removes the listener from the elements.
 *
 * @template {keyof HTMLElementTagNameMap} S
 * @template {keyof HTMLElementEventMap} E
 * @param {S} selectors - CSS selectors that describes the element.
 * @param {E} name - The event's name.
 * @param {NavigationEventListener<HTMLElementTagNameMap[S], HTMLElementEventMap[E]>} listener
 * @returns {VoidFunction}
 */
export const attachListenerAll = (selectors, name, listener) => {
  document
    .querySelectorAll(selectors)
    .forEach((element) => element.addEventListener(name, listener));

  const detachListener = window[GLOBAL_MANAGER_NAME].registerEventListener(
    NavigationEventName.AfterTransition,
    () =>
      document
        .querySelectorAll(selectors)
        .forEach((element) => element.addEventListener(name, listener))
  );

  return () => {
    document
      .querySelectorAll(selectors)
      .forEach((element) => element.removeEventListener(name, listener));
    detachListener();
  };
};

/**
 * Registers a *listener* to be invoked before leaving the
 * current page.
 *
 * @param {VoidFunction} listener
 * @returns {VoidFunction} A function that unregisters the *listener*.
 */
export const beforeOutTransition = (listener) =>
  window[GLOBAL_MANAGER_NAME].registerEventListener(
    NavigationEventName.BeforeTransition,
    listener
  );

/**
 * Registers a *listener* to be invoked after rendering the
 * current page. It is the place to write the custom code
 * because the functionality will be preserved while navigating
 * from page to page.
 *
 * **The code outside this hook will be executed only on the first page render.**
 *
 * @param {VoidFunction} listener
 * @returns {VoidFunction} A function that unregisters the *listener*.
 */
export const afterInTransition = (listener) => {
  // After the very first page load it is likely that the
  // code in the *listener* should be executed.
  listener();

  return window[GLOBAL_MANAGER_NAME].registerEventListener(
    NavigationEventName.AfterTransition,
    listener
  );
};

/**
 * Starts the transition to the next page.
 *
 * @param {string} uri - The absolute URI of the next page.
 * @returns {Promise.<void>}
 */
export const moveTo = (uri) =>
  window[GLOBAL_MANAGER_NAME].navigate(shortenSameSiteURI(uri));
