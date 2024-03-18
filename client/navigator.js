import Snapshot from './snapshot.js';

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    // bitwise shift hash left 5 places, then add hash and the char code
    hash = (hash << 5) + hash + char;
  }

  return hash.toString(16);
}

function getUniqueKey(fn, urlTest) {
  const urlKey = urlTest instanceof RegExp ? `RegExp(${urlTest.source})` : urlTest.toString();
  const fnString = fn.toString();

  return djb2Hash(fnString + urlKey);
}


export default class Navigator {
  #session;
  #pageLoaded;
  #beforeLeavingSnapshotCallbacks = [];
  #afterRenderingSnapshotCallbacks = new Map();

  constructor(session) {
    this.#session = session;
  }

  get currentUrl() {
    return new URL(location.href);
  }

  registerOnLeaveCallback(callback, options) {
    const registeredOn = this.currentUrl;

    this.#beforeLeavingSnapshotCallbacks.push({
      test: this.#createURLMatchFunction(registeredOn, options?.forPage),
      fn: callback
    });
  }

  registerOnRenderCallback(callback, options) {
    const registeredOn = this.currentUrl;
    const test = this.#createURLMatchFunction(registeredOn, options?.forPage);
    const key = getUniqueKey(callback, options?.forPage);

    const callbackItem = { test, fn: callback, key, index: options?.index ?? 0 };

    if (!this.#afterRenderingSnapshotCallbacks.has(key)) {
      this.#afterRenderingSnapshotCallbacks.set(key, callbackItem);

      if (test(registeredOn)) {
        callback(registeredOn);
      }
    }
  }

  async navigateTo(url, replace = false) {
    url = url instanceof URL ? url : new URL(url, this.currentUrl.origin);

    const nextSnapshot = await this.prepareSnapshotFor(url);

    await this.#callLeaveCallbacks(url);
    await this.#session.renderer.render(nextSnapshot);

    history[replace ? 'replaceState' : 'pushState'](
      { postdoc: {} },
      url.toString(),
      url
    );

    await this.#callRenderCallbacks();

    if (url.hash.length) {
      this.#session.renderer.currentSnapshot.body
        .querySelector(`[id="${url.hash.slice(1)}"]`)
        ?.scrollIntoView();
    } else {
      scroll(0, 0);
    }
  }

  reload() {
    location.reload();
  }

  async #callRenderCallbacks() {
    const url = this.currentUrl;

    const callbacks = Array.from(this.#afterRenderingSnapshotCallbacks.values()).sort((a, b) => a.index - b.index);

    for (const { fn, test } of callbacks) {
      if (test(url)) {
        await fn(url);
      }
    }
  }

  async #callLeaveCallbacks(nextUrl) {
    const url = this.currentUrl;

    const maybePromises = this.#beforeLeavingSnapshotCallbacks
      .filter(({ test }) => test(url))
      .map(({ fn }) => fn(url, nextUrl));

    await Promise.all(maybePromises);
  }

  #createURLMatchFunction(registeredOn, forPage) {
    if (!forPage) {
      return (url) => registeredOn.pathname === url.pathname;
    }

    if (forPage instanceof RegExp) {
      return (url) => forPage.test(url.href);
    }

    return forPage;
  }

  setup() {
    addEventListener('load', async () => {
      // Span execution until the next microtask, so the very first popstate event will be skipped.
      await Promise.resolve();
      this.#pageLoaded = true;
    });
    addEventListener('popstate', async (event) => {
      if (this.#shouldHandlePopStateEvent()) {
        const { postdoc } = event.state ?? {};

        if (postdoc) {
          await this.navigateTo(this.currentUrl);
        }
      }
    });
  }

  #shouldHandlePopStateEvent() {
    return (
      this.#pageLoaded ||
      this.#session.renderer.currentSnapshot.readyState === 'complete'
    );
  }

  async prepareSnapshotFor(url) {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/html'
      }
    });

    const html = await response.text();

    return Snapshot.from(html);
  }
}
