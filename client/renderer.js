import Snapshot from "./snapshot.js";

export default class Renderer {
  #session;
  #currentSnapshot = new Snapshot(document);
  #cleanupCallbacks = [];
  #afterRenderCallbacks = [];

  constructor(session) {
    this.#session = session;

    this.#setupAnchorTraps();
  }

  get currentSnapshot() {
    return this.#currentSnapshot;
  }

  async render(nextSnapshot) {
    await this.#performCleanups();

    await nextSnapshot.into(this.#currentSnapshot);

    this.#setupAnchorTraps();
  }

  registerCleanup(callback, options, registeredOn) {
    this.#cleanupCallbacks.push({
      test: this.#createURLMatchFunction(registeredOn, options?.forPage),
      fn: callback,
    });
  }

  registerRender(callback, options, registeredOn) {
    const test = this.#createURLMatchFunction(registeredOn, options?.forPage);

    this.#afterRenderCallbacks.push({ test, fn: callback });

    if (test(registeredOn)) {
      callback(registeredOn);
    }
  }

  async callRenderCallbacks() {
    const url = this.#session.navigator.currentUrl;

    const maybePromises = this.#afterRenderCallbacks
      .filter(({ test }) => test(url))
      .map(({ fn }) => fn(url));

    await Promise.all(maybePromises);
  }

  async #performCleanups() {
    const url = this.#session.navigator.currentUrl;

    const maybePromises = this.#cleanupCallbacks
      .filter(({ test }) => test(url))
      .map(({ fn }) => fn(url));

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

  #setupAnchorTraps() {
    Array.from(this.#currentSnapshot.body.querySelectorAll("a[href]"))
      .filter((element) => element.host === location.host)
      .filter((element) => !element.getAttribute("href").startsWith("#"))
      .forEach((element) =>
        element.addEventListener("click", async (event) => {
          event.preventDefault();

          const url = new URL(element.href);

          await this.#session.navigator.navigateTo(url);
        }),
      );
  }
}
