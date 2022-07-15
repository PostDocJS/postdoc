/**
 * @file contains the definition of the `Result` monad.
 *
 * @module result
 */

const {isObject} = require('./fp.js');

/**
 * A type that can contain either the success value or the failure.
 *
 * @template Y
 * @template N
 * @typedef {Object} Result
 * @property {() => boolean} isOk
 * @property {() => boolean} isErr
 * @property {(defaultValue: (error: N) => Y) => Y} extract
 * @property {<U>(callback: (value: Y) => U) => Result<U, N>} map
 * @property {<E>(callback: (value: N) => E) => Result<Y, E>} mapErr
 * @property {<U>(other: Result<(value: Y) => U, N>) => Result<U, N>} apply
 * @property {<U>(callback: (value: Y) => Result<U, N>) => Result<U, N>} chain
 */

/**
 * Describes possible *Result* states.
 * @enum {string}
 */
const State = Object.freeze({
  Ok: '$Ok',
  Err: '$Err'
});

const TYPE = Symbol();

/**
 * Checks whether the *value* is a *Result* object.
 *
 * @param {unknown} value
 * @returns {value is Result<unknown, unknown>}
 */
const isResult = (value) => isObject(value) && TYPE in value;

/**
 * @template O
 * @template E
 * @template {State} K
 * @param {K} kind
 * @param {O|E} value
 * @returns {Result<O, E>}
 */
const _Result = (kind, value) => ({
  [TYPE]: null,
  map: (callback) => (kind === State.Ok ? Ok(callback(value)) : Err(value)),
  isOk: () => kind === State.Ok,
  chain: (callback) => (kind === State.Ok ? callback(value) : Err(value)),
  apply: (other) =>
    kind === State.Ok ? other.map((fn) => fn(value)) : Err(value),
  isErr: () => kind === State.Err,
  extract: (defaultValue) => (kind === State.Ok ? value : defaultValue(value)),
  mapErr: (callback) => (kind === State.Ok ? Ok(value) : Err(callback(value)))
});

/**
 * Creates a {@link Result} object with a success value.
 *
 * @template T
 * @template [E=never]
 * @param {T} value
 * @returns {Result<T, E>}
 */
const Ok = (value) => _Result(State.Ok, value);

/**
 * Creates a {@link Result} object with a failure value.
 *
 * @template E
 * @template [T=never]
 * @param {E} value
 * @returns {Result<T, E>}
 */
const Err = (value) => _Result(State.Err, value);

/**
 * Wraps the result of the *callback* into the *Result* monad.
 *
 * **It doesn't convert a promise's result.**
 *
 * @template T
 * @template {Error} [E=Error]
 * @param {() => T} callback
 * @returns {Result<T, E>}
 */
const tryExecute = (callback) => {
  try {
    return Ok(callback());
  } catch (error) {
    return Err(error);
  }
};

/**
 * @template {readonly Result<unknown, unknown>[]} T
 * @template {readonly unknown[]} [S=[]]
 * @template [I=never]
 * @typedef {T extends [Result<infer A, infer B>, ...infer Rest] ? MergedResults<Rest, [...S, A], I | B> : T extends [Result<infer Q, infer W>] ? Result<[...S, Q], I | W> : T extends [] ? Result<S, I> : never} MergedResults
 */

/**
 * Merges the array of the {@link Result} object into one with
 * the array of successful values. Objects are evaluated
 * sequentially and if at least one is in the *Err* state then
 * the returned *Result* will be in the *Err* state.
 *
 * @template {readonly Result<unknown, unknown>[]} T
 * @param {T} results
 * @returns {Result<MergedResults<T>, never>}
 */
const mergeResults = (results) =>
  results.reduce(
    (accumulator, result) =>
      accumulator.chain((list) =>
        result.map((value) => (list.push(value), list))
      ),
    Ok([])
  );

exports.Ok = Ok;
exports.Err = Err;
exports.isResult = isResult;
exports.tryExecute = tryExecute;
exports.mergeResults = mergeResults;
