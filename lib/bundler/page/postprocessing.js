const CLOSING_HEAD_TAG = '</head>';

const HTML_TAG_RE = /<html(.(?!lang=))*>/;

/**
 * Injects the meta information into the document.
 * It can be:
 *
 * - `meta` tags.
 * - `html` attributes.
 * - `body` attributes.
 *
 * @param {import('./front-matter.js').Meta|null} meta
 */
export const injectMeta = (meta) =>
  /** @param {string} content */
  (content) => meta
    ? content
      .replace(
        CLOSING_HEAD_TAG,
        meta.tags + '\n' + CLOSING_HEAD_TAG
      )
      .replace(HTML_TAG_RE, `<html ${
        meta.html.lang
          ? `lang="${meta.html.lang}"`
          : ''
      } $1>`)
    : content;
