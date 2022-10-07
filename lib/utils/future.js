/**
 * @file contains definition of the `Future` monad.
 *   It plays the same role as the `Promise`, but
 *   `Future` can be repeatedly executed and return
 *   the `Result` monad as a value.
 *
 * @module future
 */

const {isPromise} = require('util').types;

const {Ok, Err} = require('./result.js');
const {isObject} = require('./fp.js');
const {Resolve, Reject} = require('./promise.js');

const TYPE = Symbol();

/**
 * Checks whether the *value* is the `Future` object.
 *
 * @param {unknown} value
 * @returns {value is Future<unknown, unknown>}
 */
const isFuture = (value) => isObject(value) && TYPE in value;

/**
 * A `Future` monad type.
 *
 * @template T
 * @template E
 * @typedef {Object} IFuture
 * @property {<U>(callback: (value: T) => U) => IFuture<U, E>} map
 * @property {() => Promise<import('./result.js').Result<T, E>>} run
 * @property {<U>(other: IFuture<(value: T) => U, E>) => IFuture<U, E>} apply
 * @property {<U>(callback: (value: T) => IFuture<U, E>) => IFuture<U, E>} chain
 */

/**
 * @template T
 * @template E
 * @callback ForkFunction
 * @param {(value: T) => void} done
 * @param {(value: E) => void} fail
 * @returns {void|Promise<void>}
 */

/**
 * Builds a type that operates over future values.
 *
 * @template T
 * @template E
 * @param {ForkFunction<T, E>|Promise<T>|IFuture<T, E>} value
 * @returns {IFuture<T, E>}
 */
const Future = (value) => {
  const start = isPromise(value)
    ? (succeed, fail) => value.then(succeed, fail)
    : isFuture(value)
      ? (succeed, fail) =>
        value.run().then((result) => result.map(succeed).mapErr(fail))
      : value;

  return {
    [TYPE]: null,
    map: (callback) =>
      Future((succeed, fail) =>
        start((value) => succeed(callback(value)), fail)
      ),
    chain: (callback) =>
      Future((succeed, fail) =>
        start(
          (value) =>
            callback(value)
              .run()
              .then((result) => result.map(succeed).mapErr(fail)),
          fail
        )
      ),
    apply: (other) =>
      Future((succeed, fail) =>
        other
          .run()
          .then((result) =>
            result
              .map((fn) => start((value) => succeed(fn(value)), fail))
              .mapErr(fail)
          )
      ),
    run: () =>
      new Promise((resolve) =>
        start(
          (value) => resolve(Ok(value)),
          (error) => resolve(Err(error))
        )
      )
  };
};

/**
 * Created succeeded {@link IFuture} object.
 *
 * @template T
 * @param {T} value
 * @returns {IFuture<T, never>}
 */
const Succeed = (value) => Future(Resolve(value));

/**
 * Created failed {@link IFuture} object.
 *
 * @template T
 * @param {T} value
 * @returns {IFuture<never, T>}
 */
const Fail = (value) => Future(Reject(value));

/**
 * Extracts a success value from the {@link IFuture} object.
 *
 * @template {IFuture<unknown, unknown>} T
 * @typedef {T extends IFuture<infer U, unknown> ? U : never} SuccessOf
 */

/**
 * Extracts a failure value from the {@link IFuture} object.
 *
 * @template {IFuture<unknown, unknown>} T
 * @typedef {T extends IFuture<unknown, infer U> ? U : never} ErrorOf
 */

/**
 * Merges many {@link IFuture}s into the array of {@link import('./result.js').Result}s.
 *
 * @template {readonly IFuture<unknown, unknown>[]} T
 * @template {readonly import('./result.js').Result<unknown, unknown>[]} [R=[]]
 * @typedef {T extends readonly [IFuture<infer A, infer B>, ...infer Rest] ? MergedFutures<Rest, [...R, import('./result.js').Result<A, B>]> : T extends readonly [IFuture<infer I, infer L>] ? [...R, import('./result.js').Result<I, L>] : T extends readonly [] ? R : T extends readonly IFuture<infer W, infer M>[] ? readonly import('./result.js').Result<W, M>[] : never} MergedFutures
 */

/**
 * Merges all {@link IFuture}s into one with the array of results
 * from all futures.
 *
 * @template {readonly IFuture<unknown, unknown>[]} Futures
 * @param {Futures} futures
 * @returns {IFuture<MergedFutures<Futures>, never>}
 */
const mergeFutures = (futures) =>
  Future((done, fail) =>
    Promise
      .all(futures.map((future) => future.run()))
      .then(done, fail)
  );

exports.Fail = Fail;
exports.Future = Future;
exports.Succeed = Succeed;
exports.isFuture = isFuture;
exports.mergeFutures = mergeFutures;
