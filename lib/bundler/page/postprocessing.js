const process = require('process');

const {withURLSeparator} = require('../../utils/url.js');

const CLOSING_BODY_TAG = '</body>';
const CLOSING_HEAD_TAG = '</head>';

const HTML_TAG_RE = /<html(.(?!lang=))*>/;

/**
 * Injects the script to the Navigation manager into a page.
 * It's necessary to even empty pages will register the manager
 * after loading and establish the client-side navigation.
 *
 * @param {string} content
 */
const injectManagerScript = (content) => content
  .replace(
    CLOSING_BODY_TAG,
    '<script type="module" src="~/node_modules/postdoc/lib/assets/files/client/manager.js"></script>\n'
    + CLOSING_BODY_TAG
  );

/**
 * Injects the main page's script if there is any.
 *
 * @param {import('../pages.js').Page} page
 */
const injectMainScript = (page) =>
  /** @param {string} content */
  (content) => page.script.exists()
    ? content.replace(
      /* eslint-disable */
      CLOSING_BODY_TAG,
      `<script type="module" src="${
        withURLSeparator(page.script.source().replace(process.cwd(), '~'))
      }"></script>\n${CLOSING_BODY_TAG}`
    )
    /* eslint-enable */
    : content;

/**
 * Injects the main page's stylesheet file if there is any.
 *
 * @param {import('../pages.js').Page} page
 */
const injectMainStyle = (page) =>
  /** @param {string} content */
  (content) => page.style.exists()
    ? content.replace(
      /* eslint-disable */
      CLOSING_HEAD_TAG,
      `<link rel="stylesheet" href="${
        withURLSeparator(page.style.source().replace(process.cwd(), '~'))
      }"/>\n${CLOSING_HEAD_TAG}`
    )
    /* eslint-enable */
    : content;

/**
 * Injects the meta information into the document.
 * It can be:
 *
 * - `meta` tags.
 * - `html` attributes.
 * - `body` attributes.
 *
 * @param {Object|null} meta
 */
const injectMeta = (meta) =>
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

exports.injectMeta = injectMeta;
exports.injectMainStyle = injectMainStyle;
exports.injectMainScript = injectMainScript;
exports.injectManagerScript = injectManagerScript;
