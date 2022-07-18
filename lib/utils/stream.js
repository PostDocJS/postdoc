const {identity, isObject} = require('./fp.js');

const TYPE = Symbol();

/**
 * Checks whether a *value* is type of the Stream object.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
const isStream = (value) => isObject(value) && TYPE in value;

/**
 * Creates a *Stream* object.
 * It is a long-lived lazy reactive instance that executes
 * list of functions (**fns**) when a new value appears in the
 * stream. If value is `undefined` or any function returns
 * `undefined` then next functions and the final listener aren't
 * executed.
 *
 * @param {...((arg: unknown) => unknown)} fns
 */
const Stream = (...fns) => {
  const transform = fns.reduce(
    (abstraction, fn) => (argument) => {
      if (argument === undefined) {
        return;
      }

      const result = abstraction(argument);

      if (result === undefined) {
        return;
      }

      return fn(result);
    },
    identity
  );

  const listeners = new Set();

  return {
    [TYPE]: null,
    /**
     * Sends a *value* to the *Stream*.
     *
     * @param {unknown} value
     */
    send: (value) =>
      listeners.forEach((fn) => {
        const result = transform(value);

        if (result !== undefined) {
          isStream(fn) ? fn.send(result) : fn(result);
        }
      }),
    /**
     * Registers a listener to the stream's final value.
     * Returns an unsubscribe function that removes the listener
     * from the subscribers list.
     *
     * @param {ReturnType<typeof Stream>|((arg: unknown) => unknown)} fn
     * @returns {VoidFunction}
     */
    forEach: (fn) => {
      listeners.add(fn);
      
      return () => {
        listeners.delete(fn);
      };
    }
  };
};

exports.Stream = Stream;
exports.isStream = isStream;