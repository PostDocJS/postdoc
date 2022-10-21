/**
 * @file contains the definition of the `Option` monad.
 *
 * @module option
 */

const {isObject, isNothing, panic} = require('./fp.js');

/**
 * A type that can contain either the value or nothing.
 *
 * @template T
 * @typedef {Object} Option
 * @property {() => boolean} isSome
 * @property {() => boolean} isNone
 * @property {(defaultValue: () => T) => T} extract
 * @property {(message?: string) => T} unsafeExtract
 * @property {<U>(callback: (value: T) => U) => Option<U>} map
 * @property {<U>(other: Option<(value: T) => U>) => Option<U>} apply
 * @property {<U>(callback: (value: T) => Option<U>) => Option<U>} chain
 */

const TYPE = Symbol();

/**
 * Checks whether the *value* is an *Option* object.
 *
 * @param {unknown} value
 * @returns {value is Option<unknown>}
 */
const isOption = (value) => isObject(value) && TYPE in value;

/**
 * @template O
 * @param {O|null|undefined} value
 * @returns {Option<O>}
 */
const Option = (value) => ({
  [TYPE]: null,
  map: (callback) => Option(isNothing(value) ? null : callback(value)),
  isSome: () => !isNothing(value),
  chain: (callback) => (isNothing(value) ? Option(null) : callback(value)),
  apply: (other) =>
    isNothing(value) ? Option(null) : other.map((fn) => fn(value)),
  isNone: () => isNothing(value),
  extract: (defaultValue) => (isNothing(value) ? defaultValue() : value),
  unsafeExtract: (message = 'Cannot unwrap an Option object with null or undefined.') =>
    (isNothing(value) ? panic(message) : value)
});

exports.None = Option(null);
exports.Some = Option;
exports.Option = Option;
exports.isOption = isOption;
