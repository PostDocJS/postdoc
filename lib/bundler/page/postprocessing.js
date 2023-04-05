const CLOSING_HEAD_TAG = '</head>';

const navigationManagerScript = '<script type="module">import \'postdoc/client\';</script>';

/**
 * Injects HTML into the compiled page content.
 *
 * @param {string} content
 * @returns {string}
 */
export const postprocess = (content) =>
  content.replace(CLOSING_HEAD_TAG, `${navigationManagerScript}\n${CLOSING_HEAD_TAG}`);