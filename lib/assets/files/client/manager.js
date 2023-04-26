/**
 * @file Contains the definition of the Navigation manager
 *   entity.
 *
 * @module client_manager
 */

import {startTransition} from './transition.js';
import {shortenSameSiteURI} from './utilities.js';
import {NavigationEventName, GLOBAL_MANAGER_NAME} from './constants.js';

/**
 * Intervenes the anchors behaviour and prevents the default
 * page loading in favour of custom page switching.
 */
const trapAnchors = () =>
  document.body.querySelectorAll('a[href]').forEach((anchor) => {
    if (anchor.host === location.host) {
      anchor.setAttribute('data-internal', true);

      anchor.addEventListener('click', async (event) => {
        event.preventDefault();

        await globalThis[GLOBAL_MANAGER_NAME].navigate(anchor.getAttribute('href'));

        trapAnchors();

        // Focus first element (accessibility).
        document.body.firstElementChild.focus();
      });
    } else {
      anchor.setAttribute('data-external', true);
    }
  });

/**
 * @typedef {import('./index.js').TransitionOptions} TransitionHookOptions
 * @property {string} registeredOn
 */

if (!(GLOBAL_MANAGER_NAME in globalThis)) {
  /** @type {Map<NavigationEventName, Array<[import('./index.js').TransitionHook, TransitionHookOptions]>>} */
  const events = new Map([
    [NavigationEventName.AfterTransition, []],
    [NavigationEventName.BeforeTransition, []]
  ]);

  /** The Navigation manager. */
  window[GLOBAL_MANAGER_NAME] = {
    /**
     * Performs navigation to the next page.
     *
     * @param {string} uri - The path to the next page.
     * @param {boolean} [replaceContext=false] - Signals whether
     *   the new record should be added to the History or not.
     *   It is useful while navigating through History API methods
     *   or browser's buttons.
     *   By default, the transition will append a new entry to
     *   the History.
     */
    navigate: async (uri, replaceContext = false) => {
      const shortURI = shortenSameSiteURI(uri);

      // If shortURI is undefined then it means that user tries to
      // navigate to an external uri. In that case, we shouldn't do
      // anything as this method meant to be used only for internal
      // navigation.
      if (!shortURI) {return}

      await Promise.all(
        events.get(NavigationEventName.BeforeTransition).map(([hook, {forPage, registeredOn}]) => {
          if (
            registeredOn === shortURI ||
              forPage instanceof RegExp && forPage.test(shortURI) ||
              typeof forPage === 'function' && forPage(shortURI)
          ) {
            return hook(shortURI);
          }
        })
      );

      history[(replaceContext ? 'replace' : 'push') + 'State'](
        {uri: shortURI},
        shortURI,
        shortURI
      );

      await startTransition(shortURI);

      await Promise.all(
        events.get(NavigationEventName.AfterTransition).map(([hook, {forPage, registeredOn}]) => {
          if (
            registeredOn === shortURI ||
              forPage instanceof RegExp && forPage.test(shortURI) ||
              typeof forPage === 'function' && forPage(shortURI)
          ) {
            return hook(shortURI);
          }
        })
      );
    },
    /**
     * Registers a custom navigation *listener*.
     * Returns a function that undoes registering.
     *
     * @param {NavigationEventName} eventName
     * @param {VoidFunction} listener
     * @param {import('./index.js').TransitionOptions} options
     * @returns {VoidFunction}
     */
    registerEventListener: (eventName, listener, options) => {
      const currentPage = location.pathname;

      events.get(eventName).push([
        listener,
        {...options, registeredOn: currentPage}
      ]);

      return () =>
        void events.set(
          eventName,
          events
            .get(eventName)
            .filter(([hook]) => hook !== listener)
        );
    }
  };

  // Preserves the behaviour of the "back" and "forward" browser buttons.
  addEventListener(
    'popstate',
    ({state}) =>
      globalThis[GLOBAL_MANAGER_NAME].navigate(state?.uri ?? location.pathname, true)
  );

  // Traps all anchors on the current page.
  addEventListener('load', trapAnchors);

  if (import.meta.hot) {
    import.meta.hot.on('postdoc:reload-page', () => location.reload());
  }
}
