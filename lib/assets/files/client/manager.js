/**
 * @file Contains the definition of the Navigation manager
 *   entity.
 *
 * @module client_manager
 */

import {injectPage} from './transition.js';
import {shortenSameSiteURI} from './utilities.js';
import {NavigationEventName, GLOBAL_MANAGER_NAME} from './constants.js';

/**
 * Intervens the anchors behaviour and prevents the default
 * page loading in favour of custom page switching.
 */
const trapAnchors = () =>
  document.body.querySelectorAll('a[href]').forEach((anchor) =>
    anchor.addEventListener('click', (event) => {
      event.preventDefault();

      window[GLOBAL_MANAGER_NAME].navigate(shortenSameSiteURI(anchor.href));
    })
  );

if (!(GLOBAL_MANAGER_NAME in window)) {
  /**
   * Stores custom navigation listeners.
   * The keys are the page's URIs.
   *
   * @type {Map.<string, VoidFunction[]>}
   */
  const events = new Map();

  /** The Navigation manager. */
  window[GLOBAL_MANAGER_NAME] = {
    events: import.meta.env.DEV ? events : null,
    /**
     * Performs navigation to the next page.
     *
     * @param {string} uri - The path to the next page.
     */
    navigate: async (uri) => {
      const shortURI = shortenSameSiteURI(uri);

      await Promise.all(
        events
          .get(location.pathname)
          ?.filter(
            (description) =>
              description.eventName === NavigationEventName.BeforeTransition
          )
          .map(({listener}) => listener()) ?? []
      );

      history.pushState({uri: shortURI}, '', shortURI);

      await injectPage(shortURI);

      trapAnchors();

      await Promise.all(
        events
          .get(shortURI)
          ?.filter(
            (description) =>
              description.eventName === NavigationEventName.AfterTransition
          )
          .map(({listener}) => listener()) ?? []
      );
    },
    /**
     * Registers a custom navigation *listener* for the
     * current page. Returns a function that unregisters the *listener*.
     *
     * @param {NavigationEventName} eventName
     * @param {VoidFunction} listener
     * @returns {VoidFunction}
     */
    registerEventListener: (eventName, listener) => {
      const currentPage = location.pathname;

      if (!events.has(currentPage)) {
        events.set(currentPage, []);
      }

      events.get(currentPage).push({
        listener,
        eventName
      });

      return () =>
        void events.set(
          currentPage,
          events
            .get(currentPage)
            .filter(
              (description) =>
                description.listener !== listener ||
                description.eventName !== eventName
            )
        );
    }
  };

  // Preserves the behaviour of the "back" and "forward" browser buttons.
  addEventListener(
    'popstate',
    ({state}) =>
      state?.uri &&
      window[GLOBAL_MANAGER_NAME].navigate(shortenSameSiteURI(state.uri))
  );

  // Traps all anchors on the current page.
  addEventListener('load', trapAnchors);
}
