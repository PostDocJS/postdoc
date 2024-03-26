import Renderer from './renderer.js';
import Navigator from './navigator.js';

export default class Session {
  renderer = new Renderer(this);
  navigator = new Navigator(this);

  constructor() {
    this.#setupViteConnection();
  }

  init() {
    this.renderer.init();
    this.navigator.setup();
  }

  #setupViteConnection() {
    if (import.meta.hot) {
      import.meta.hot.on('postdoc:reload-page', () => this.navigator.reload());

      import('./overlay.js').then(() => {
        let overlay;

        import.meta.hot.on('vite:ws:disconnect', () => {
          // Close a previous one if it exists.
          overlay?.close();

          overlay =
            this.renderer.currentSnapshot.createElement('postdoc-overlay');

          overlay.shadowRoot.querySelector('.plugin').append('postdoc');
          overlay.shadowRoot
            .querySelector('.message-body')
            .append(' ', 'Server is stopped.');

          this.renderer.currentSnapshot.body.append(overlay);
        });

        import.meta.hot.on('vite:ws:connect', () => {
          overlay?.close();
        });
      });
    }
  }
}
