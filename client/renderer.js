import Snapshot from './snapshot.js';

export default class Renderer {
  #session;
  #currentSnapshot = new Snapshot(document);

  constructor(session) {
    this.#session = session;

    this.#setupAnchorTraps();
  }

  get currentSnapshot() {
    return this.#currentSnapshot;
  }

  async render(nextSnapshot) {
    await nextSnapshot.into(this.#currentSnapshot);

    this.#setupAnchorTraps();
  }

  #setupAnchorTraps() {
    Array.from(this.#currentSnapshot.body.querySelectorAll('a[href]'))
      .filter((element) => element.host === location.host)
      .filter((element) => !element.getAttribute('href').startsWith('#'))
      .forEach((element) =>
        element.addEventListener('click', async (event) => {
          event.preventDefault();

          const url = new URL(element.href);

          await this.#session.navigator.navigateTo(url);
        })
      );
  }
}
