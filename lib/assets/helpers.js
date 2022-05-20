/**
 * @file Helpers for the asset manager.
 *
 * @module asset_helpers
 */

/**
 * Builds a layout's fine name base on the name of the page
 * for which the layout is created.
 *
 * @param {string} pageName
 */
const createLayoutFileName = (pageName) => pageName + '.html.ejs';

exports.createLayoutFileName = createLayoutFileName;
