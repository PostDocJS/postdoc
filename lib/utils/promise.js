/**
 * A wrapper around the *Promise.resolve* method.
 *
 * @template T
 * @param {Awaited<T>} value
 */
const Resolve = (value) => Promise.resolve(value);

/** A wrapper around the *Promise.reject* method. */
const Reject = (value) => Promise.reject(value);

exports.Reject = Reject;
exports.Resolve = Resolve;
