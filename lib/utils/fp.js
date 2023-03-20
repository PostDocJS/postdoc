/**
 * @file Contains entities that allow code in functional style.
 *
 * @module fp
 */

/**
 * Returns the parameter unchanged.
 *
 * @template T
 * @param {T} any
 * @returns {T}
 */
export const identity = (any) => any;

/**
 * Inverts the result of the *fn*.
 *
 * @template {(...param: readonly unknown[]) => unknown} Fn
 * @param {Fn} fn
 * @returns {(...params: Parameters<Fn>) => boolean}
 */
export const not =
  (fn) =>
    (...args) =>
      !fn(...args);

/**
 * Checks whether the *value* is object.
 *
 * @param {unknown} value
 */
export const isObject = (value) => value !== null && typeof value === 'object';

/**
 * Panics with a message.
 * Errors thrown by this function shouldn't be caught.
 *
 * @param {string} message
 */
export const panic = (message) => {
  throw new Error(message);
};

/**
 * Checks whether value is void or something imaginable.
 *
 * @template T
 * @param {T} value
 * @returns {boolean}
 */
export const isNothing = (value) => value == null;

/**
 * Converts a value into the Array.
 *
 * @template T
 * @param {*} value
 * @returns {T[]}
 */
export const toArray = (value) => Array.isArray(value)
  ? value
  : isObject(value) && ('length' in value || Symbol.iterator in value)
    ? Array.from(value)
    : [value];

/**
 * Gets a first type of the tuple.
 *
 * @template T
 * @typedef {T extends readonly [infer K, ...infer _] ? K : never} First
 */

/**
 * Gets a last type of the tuple.
 *
 * @template T
 * @typedef {T extends readonly [...infer _, infer K] ? K : never} Last
 */

/**
 * Performs left-to-right function composition.
 *
 * @template {...((param: unknown) => unknown)} T
 * @param {T} fns
 * @returns {(parameter: First<Parameters<First<T>>>) => Last<T>}
 */
export const pipe = (...fns) => fns.reduce(
  (accumulator, fn) => (parameter) => fn(accumulator(parameter)),
  identity
);

/**
 * Performs right-to-left function composition.
 *
 * @template {...((param: unknown) => unknown)} T
 * @param {T} fns
 * @returns {(parameter: First<Parameters<Last<T>>>) => First<T>}
 */
export const compose = (...fns) => pipe(...fns.reverse());

/**
 * Performs parallel function composition.
 * All functions are executed with the same value and the result is
 * an array of functions' results.
 *
 * @template A
 * @template {...((param: A) => unknown)} T
 * @param {T} fns
 * @returns {(parameter: A) => Array<unknown>}
 */
export const parallel = (...fns) => (value) => fns.map((fn) => fn(value));

/**
 * @template T
 * @template R
 * @callback Reducer
 * @param {T} accumulator
 * @param {R} value
 * @returns {T}
 */

/**
 * @template T
 * @template R
 * @callback Transducer
 * @param {Reducer<T, R>} reducer
 * @returns {Reducer<T, R>}
 */

/**
 * Builds a control flow executors.
 *
 * @template T
 * @template R
 * @param {(value: T) => boolean} predicate
 * @param {(value: T) => R} onTrue
 * @param {(value: T) => R} onFalse
 * @returns {(value: T) => R}
 */
export const biExecutor = (predicate, onTrue, onFalse = () => undefined) =>
  (value) =>
    predicate(value) ? onTrue(value) : onFalse(value);

/**
 * Builds a control flow expression.
 *
 * @template {readonly unknown[]} T
 * @template R
 * @param {(...args: T) => boolean} predicate
 * @param {(...args: T) => R} onTrue
 * @param {(...args: T) => R} [onFalse]
 * @returns {(...args: T) => R | null}
 */
export const when = (predicate, onTrue, onFalse = () => null) => (...args) =>
  predicate(...args) ? onTrue(...args) : onFalse(...args);

/**
 * Memorizes results of the _fn_ reducing computations.
 *
 * @param {(...args: Array<unknown>) => unknown} fn
 * @param {(...args: Array<unknown>) => string} [keyFrom]
 * @returns {(...args: Array<unknown>) => unknown & {readonly cache: Map<string, unknown>}}
 */
export const memo = (fn, keyFrom = JSON.stringify) => {
  const cache = new Map();

  return Object.assign(
    (...args) => {
      const key = keyFrom(args);

      if (!cache.has(key)) {
        cache.set(key, fn(...args));
      }

      return cache.get(key);
    },
    {
      get cache() {
        return cache;
      }
    }
  );
};

/**
 * Registers an effect that has to be executed with some value.
 *
 * @template T
 * @param {(value: T) => unknown}
 * @returns {(value: T) => T}
 */
export const tap = (fn) => (value) => (fn(value), value);
