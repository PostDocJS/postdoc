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
        scrollTo(0, 0);

        // Focus first element (accessibility).
        document.body.firstElementChild.focus();
      });
    } else {
      anchor.setAttribute('data-external', true);
    }
  });

if (!(GLOBAL_MANAGER_NAME in globalThis)) {
  /**
   * Stores custom navigation listeners.
   * The keys are the page's URIs.
   *
   * @type {Map.<string, VoidFunction[]>}
   */
  const events = new Map();

  /**
   * Stores events that has to be executed on every
   * page.
   *
   * @type {Map.<NavigationEventName, VoidFunction[]>}
   */
  const globalEvents = new Map([
    [NavigationEventName.BeforeTransition, []],
    [NavigationEventName.AfterTransition, []]
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
      // navigate to an external uri. In that case, we shouldn't does
      // anything as this method meant to be used only for internal
      // navigation.
      if (!shortURI) {return}

      await Promise.all(
        globalEvents.get(NavigationEventName.BeforeTransition)
          .map((fn) => fn())
      );

      const currentPageTransitionCallbacks = events.get(location.pathname);
      if (currentPageTransitionCallbacks) {
        await Promise.all(
          currentPageTransitionCallbacks
            .filter(
              (description) =>
                description.eventName === NavigationEventName.BeforeTransition
            )
            .map(({listener}) => listener())
        );
      }

      history[(replaceContext ? 'replace' : 'push') + 'State'](
        {uri: shortURI},
        shortURI,
        shortURI
      );

      await startTransition(shortURI);

      const nextPageTransitionCallbacks = events.get(shortURI);
      if (nextPageTransitionCallbacks) {
        await Promise.all(
          nextPageTransitionCallbacks
            .filter(
              (description) =>
                description.eventName === NavigationEventName.AfterTransition
            )
            .map(({listener}) => listener())
        );
      }

      await Promise.all(
        globalEvents.get(NavigationEventName.AfterTransition)
          .map((fn) => fn())
      );
    },
    /**
     * Registers a custom navigation *listener* for the
     * current page. Returns a function that undoes registering.
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
    },
    /**
     * Registers a custom global transition *listener*.
     * Returns a function that undoes registering.
     *
     * @param {NavigationEventName} eventName
     * @param {VoidFunction} listener
     * @returns {VoidFunction}
     */
    registerGlobalEventListener: (eventName, listener) => {
      globalEvents.get(eventName).push(listener);

      return () =>
        void globalEvents.set(
          eventName,
          globalEvents 
            .get(eventName)
            .filter((fn) => fn !== listener)
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
}
