/**
 * @file Contains the definition of the global IoC container.
 *
 * @module container
 */

const {panic} = require('./fp.js');

const container = new Map();

/** An accessor to the global state. */
exports.Container = {
  /**
   * Returns a value from the container by the *key*.
   *
   * @template T
   * @param {symbol} key
   * @returns {T}
   * @throws {Error} if a value is not registered.
   */
  get: (key) => {
    if (container.has(key)) {
      return container.get(key);
    }

    panic('Detected an access to the undefined value.');
  },
  /**
   * Registers the *value* by the *key*.
   *
   * @param {symbol} key
   * @param {unknown} value
   * @returns {void}
   */
  set: (key, value) => {
    container.set(key, value);
  },
  /**
   * Deletes a specified with the *key* entity.
   *
   * @param {symbol} key
   */
  remove: (key) => {
    container.delete(key);
  }
};
