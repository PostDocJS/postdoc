/**
 * <h2 id="overview">Overview</h2>
 *
 * Client is part of the PostDoc functionality that lives and works
 * in the browser and is responsible for fetching and morphing pages
 * when a user navigates through the site. It works only when a browser
 * has JavaScript enabled, otherwise the default behaviour will take place.
 *
 * <h2 id="navigation">Navigation</h2>
 *
 * When a page is rendered, the client sets traps for all internal links, so
 * when it is clicked, PostDoc performs a navigation in a SPA-like manner.
 *
 * If you need to start navigation in the script, PostDoc has a public client
 * API, which exports a `go` function.
 *
 * ```ts
 * function go(url: string | URL, replace?: boolean): Promise<void>;
 * ```
 *
 * > The public API is available at the `postdoc/client` path;
 * > ```js
 * > import {} from 'postdoc/client';
 * > ```
 *
 * The first `url` parameter expects a URL of the next page.
 * The second `replace` parameter expects a boolean. That signals whether
 * a new _History_ entry should be added (when the value is falsey value)
 * or the current one should be replaced (the truthy value).
 *
 * <h2 id="lifecycle">Lifecycle</h2>
 *
 * When a page is morphed for the first time, all its scripts are executed.
 * The second time they are not executed any more. To work around that,
 * PostDoc allows executing callbacks before and after the page is rendered.
 *
 * The public client API exports functions that register those callbacks.
 *
 * - `onRender` - register **after page is rendered** callback.
 *   ```ts
 *   function onRender(callback: (currentUrl: URL) => void, options?: CallbackOptions): void;
 *   ```
 * - `onLeave` - register **before page is rendered** callback.
 *   ```ts
 *   function onLeave(callback: (currentUrl: URL, nextUrl: URL) => void, options?: CallbackOptions): void;
 *   ```
 *
 * The `CallbackOptions` allows configuring where, when and how a callback is executed.
 *
 * ```ts
 * interface CallbackOptions {
 *   forPage: RegExp | ((url: URL) => boolean)
 * }
 * ```
 *
 * By default, callback is registered for the page where it was executed. To
 * span its execution across multiple pages, the `forPage` property has to be provided.
 *
 * It may be a `RegExp` against which the page's URL will be tested or a function.
 * If `forPage` expression returns `true` after matching, a callback will be executed.
 * Otherwise, it won't.
 *
 * ```js
 * {
 *   forPage() {
 *     // Registers callback for all pages.
 *     return true;
 *   }
 * }
 * ```
 *
 * @name client
 */

import Session from './session.js';

const _session = new Session();
globalThis.PostDoc ??= _session

export const session = _session;


export async function navigateTo(url, replace) {
    await globalThis.PostDoc.navigator.navigateTo(url, replace);
}

export function onLeave(callback, options) {
    globalThis.PostDoc.navigator.registerOnLeaveCallback(callback, options);
}

export function onRender(callback, options) {
    globalThis.PostDoc.navigator.registerOnRenderCallback(callback, options);
}