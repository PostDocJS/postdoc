import Session from "./session.js";

globalThis.PostDoc ??= new Session();

export function onLeave(callback, options) {
  globalThis.PostDoc.onLeave(callback, options);
}

export function onRender(callback, options) {
  globalThis.PostDoc.onEnter(callback, options);
}

export async function go(url, replace) {
  await globalThis.PostDoc.navigateTo(url, replace);
}
