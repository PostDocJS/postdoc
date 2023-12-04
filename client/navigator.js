import Snapshot from "./snapshot.js";

export default class Navigator {
  #session;
  #pageLoaded;

  constructor(session) {
    this.#session = session;

    this.#setup();
  }

  get currentUrl() {
    return new URL(location.href);
  }

  async navigateTo(url, replace = false) {
    const nextSnapshot = await this.#prepareSnapshotFor(url);

    await this.#session.renderer.render(nextSnapshot);

    history[replace ? "replaceState" : "pushState"](
      { postdoc: {} },
      url.toString(),
      url,
    );

    await this.#session.renderer.callRenderCallbacks();

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

  #setup() {
    addEventListener("load", async () => {
      // Span execution until the next microtask, so the very first popstate event will be skipped.
      await Promise.resolve();
      this.#pageLoaded = true;
    });
    addEventListener("popstate", async (event) => {
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
      this.#session.renderer.currentSnapshot.readyState === "complete"
    );
  }

  async #prepareSnapshotFor(url) {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html",
      },
    });

    const html = await response.text();

    return Snapshot.from(html);
  }
}
