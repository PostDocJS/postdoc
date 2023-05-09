/**
 * @file Contains the definition of the Navigation manager
 *   entity.
 *
 * @module client_manager
 */

import {startTransition} from './transition.js';
import {getUrl, shortenSameSiteURI} from './utilities.js';
import {NavigationEventName, GLOBAL_MANAGER_NAME} from './constants.js';

/**
 * Action (add/replace) state interface.
 *
 * @typedef {Function} HistoryAPIAction
 * @param {Object} stateObj - An object representing the new history state.
 * @param {string} title - The title of the new state.
 * @param {string} url - The URL associated with the new state.
 * @param {boolean} [inBrowserHistory=true] - Whether the new state should be added to the browser history.
 * @returns void
 */

/**
 * History stack interface.
 *
 * @typedef {Object} HistoryAPIStack
 * @property {string} url - The URL associated with the state.
 * @property {number} index - The index of the state in the stack.
 */

/**
 * @typedef {Object} HistoryAPI
 * @property {readonly HistoryAPIStack[]} stack - A stack of all history.
 * @property {number} cursor - The current index in the stack.
 * @property {HistoryAPIAction} pushState - Adds a new state to the stack and modifies the current history entry.
 * @property {HistoryAPIAction} replaceState - Modifies the current history entry without adding a new state to the stack.
 */

/**
 * Custom History API.
 *
 * @type HistoryAPI
 */
const historyAPI = (() => {
  let stack = [{url: getUrl(), index: 0}];
  let cursor = 0;

  addEventListener('load', () => {
    const historySessionItem = sessionStorage.getItem('history');

    if (historySessionItem) {
      const {stack: stackSession, cursor: cursorSession} = JSON.parse(historySessionItem);

      stack = stackSession;
      cursor = cursorSession;
    } else {
      sessionStorage.setItem('history', JSON.stringify({stack, cursor}));

      history.replaceState(stack[0], stack[0].url, stack[0].url);
    }
  });

  return {
    get stack() {
      return stack;
    },

    get cursor() {
      return cursor;
    },

    set cursor(index) {
      cursor = index;

      sessionStorage.setItem('history', JSON.stringify({stack, cursor}));
    },

    pushState(stateObj, title, url, inBrowserHistory = true) {
      const data = {...stateObj, index: ++cursor};

      stack.push(data);

      sessionStorage.setItem('history', JSON.stringify({stack, cursor}));

      if (inBrowserHistory) {history.pushState(data, url, url)}
    },

    replaceState(stateObj, title, url, inBrowserHistory = true) {
      const data = {...stateObj, index: cursor};

      stack[data.index] = data;

      sessionStorage.setItem('history', JSON.stringify({stack, cursor}));

      if (inBrowserHistory) {history.replaceState(data, url, url)}
    }
  };
})();

/**
 * Intervenes the anchors behaviour and prevents the default
 * page loading in favour of custom page switching.
 */
const trapAnchors = () =>
  document.body.querySelectorAll('a[href]').forEach((anchor) => {
    const link = anchor.getAttribute('href');

    if (link && anchor.host === location.host && !link.startsWith('#')) {
      anchor.setAttribute('data-link-internal', true);

      anchor.addEventListener('click', async (event) => {
        event.preventDefault();

        await globalThis[GLOBAL_MANAGER_NAME].navigate(link);

        // Focus first element (accessibility).
        document.body.firstElementChild.focus();
      });
    } else {
      anchor.setAttribute('data-link-external', true);
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
          const currentUrl = getUrl();

          if (
            registeredOn === currentUrl ||
              forPage instanceof RegExp && forPage.test(currentUrl) ||
              typeof forPage === 'function' && forPage(currentUrl)
          ) {
            return hook(shortURI);
          }
        })
      );

      historyAPI[(replaceContext ? 'replace' : 'push') + 'State'](
        {url: shortURI},
        shortURI,
        shortURI
      );

      await startTransition(shortURI);

      trapAnchors();

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

  // // Preserves the behaviour of the "back" and "forward" browser buttons.
  addEventListener('popstate', ({state}) => {
    const url = getUrl();

    if (url.includes('#') && !state) {
      historyAPI.pushState({url: url}, url, url, false);

      return historyAPI.replaceState({url: url}, url, url);
    }

    const nextUrl = historyAPI.stack[state.index].url;

    historyAPI.cursor = state.index;

    globalThis[GLOBAL_MANAGER_NAME].navigate(nextUrl, true);
  });

  // Traps all anchors on the current page.
  addEventListener('load', trapAnchors);

  if (import.meta.hot) {
    import.meta.hot.on('postdoc:reload-page', () => location.reload());
  }
}
