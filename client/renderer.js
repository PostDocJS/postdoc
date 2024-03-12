import Snapshot from './snapshot.js';

export default class Renderer {
  #session;
  #currentSnapshot = new Snapshot(document);
  #preFetchCache = new Set();

  constructor(session) {
    this.#session = session;
  }

  get currentSnapshot() {
    return this.#currentSnapshot;
  }

  init() {
    if (!this.#session.configuration?.disable_spa) {
      this.#setupAnchorTraps();
    }

    if (this.#session.configuration?.enable_prefetch) {
      this.#setupEventDelegation();
    }
  }

  async render(nextSnapshot) {
    await nextSnapshot.into(this.#currentSnapshot);

    this.#setupAnchorTraps();
  }

  #setupEventDelegation() {
    const body = this.#currentSnapshot.body;

    body.addEventListener('click', this.#handleClick.bind(this));
    body.addEventListener('mouseover', this.#handleMouseover.bind(this));
  }

  #setupAnchorTraps() {
    const body = this.#currentSnapshot.body;

    body.addEventListener('click', this.#handleClick.bind(this));
    /*
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
     */
  }

  #handleClick(event) {
    const element = event.target.closest('a[href]');

    if (element && element.host === location.host && !element.getAttribute('href').startsWith('#')) {
      event.preventDefault();
      event.stopPropagation();

      const url = new URL(element.href);
      this.#session.navigator.navigateTo(url).catch(err => console.error('Navigation error:', err));
    }
  }

  #handleMouseover(event) {
    const element = event.target.closest('a[href]');
    if (element && element.host === location.host && !element.getAttribute('href').startsWith('#')) {
      const url = new URL(element.href);

      if (!this.#preFetchCache.has(url.href)) {
        fetch(url, { headers: { Accept: 'text/html' } }).then(() => {
          this.#preFetchCache.add(url.href);
        }).catch(err => console.error('Fetch error:', err));
      }
    }
  }
}
