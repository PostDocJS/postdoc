/**
 * @file This module encapsulates internal methods and instances,
 * that is used to pass text to the stdout and stderr.

 * Because we support colors that file reexports formatters
 * that allow to colorize the output.
 *
 * @module logger
 */

const {timestamp} = require('../utils/date.js');
const {Typography} = require('./colors.js');
const {Configuration} = require('../configuration/index.js');

/**
 * Describes an output level for logger's message.
 * Currently, it means which method of the Console
 * object is going to be used.
 *
 * @enum {string}
 * @readonly
 */
const LoggerLevel = {
  INFO: 'info',
  WARNING: 'warn',
  ERROR: 'error'
};

/**
 * Separator characters for the message builder.
 *
 * @enum {string}
 * @readonly
 */
const Separator = {
  Empty: '',
  Space: ' ',
  NewLine: '\n'
};

/**
 * Logger signature.
 *
 * @callback Logger
 * @param {...string} values
 * @returns {void}
 */

/**
 * Transforms a string returning a new one.
 *
 * @callback Transformer
 * @param {string} value
 * @returns {string}
 */

/**
 * Logger creator.
    /**
 * @param {LoggerLevel} level
 * @returns {Logger}
 */
const log =
  (level) =>
    /**
     * Logger function.
     * In quiet mode pass through only error messages.
     *
     * @type {Logger}
     */
    (...values) => {
      if (Configuration.logger.quiet && level !== LoggerLevel.ERROR) {
        return;
      }

      // eslint-disable-next-line no-console
      console[level](...values);
    };

/** @type {Logger} */
const info = log(LoggerLevel.INFO);
/** @type {Logger} */
const warn = log(LoggerLevel.WARNING);
/** @type {Logger} */
const error = log(LoggerLevel.ERROR);

/*
 * Builder creator for building a one-line message.
 * All methods except `build` can be chained.
 * The order of methods execution matters except
 * for some methods (see method description). The builder
 * will concatenate all message parts in the declared order.
 */
const LineBuilder = () => {
  let prefix = '';
  let message = '';
  let suffix = '';

  const transformers = [];

  const API = {
    /**
     * Defines a maper which will modify
     * the final message. There is ability to
     * define multiple mapers. In that case,
     * the order of defining mapers describing
     * the order in which changes will be made.
     *
     * Note that it isn't the same order as the order of
     * the _text_ method.
     *
     * @param {Transformer} fn
     */
    map: (fn) => (transformers.push(fn), API),
    /**
     * Defines a prefix for the message.
     * The position in a method chain doesn't matter.
     * Note that only the last value will take
     * the precedence.
     *
     * @example
     *   LineBuilder()
     *     .prefix('foo')
     *     .prefix('bar') // only this value will be saved
     *
     * @param {string} value
     */
    prefix: (value) => ((prefix = value), API),
    /**
     * Defines a suffix for the message.
     * The position in a method chain doesn't matter.
     * Note that only the last value will take
     * the precedence.
     *
     * @example
     *   LineBuilder()
     *     .suffix('foo')
     *     .suffix('bar') // only this value will be saved
     *
     * @param {string} value
     */
    suffix: (value) => ((suffix = value), API),
    /**
     * Pads the current message with a _value_
     * repeated _count_ times.
     * The position of the invokation matters.
     *
     * @param {number} count
     * @param {string} value
     */
    padStart: (count, value) => (
      (message = new Array(count).fill(value).join('') + message), API
    ),
    /**
     * Appends a _value_ to the message with a given _separator_.
     * The position of the invokation matters.
     *
     * @param {string} value - to be appended.
     * @param {Separator} [separator=Separator.Empty] - pattern that describes how the
     *   _value_ should be appended.
     */
    text: (value, separator = Separator.Empty) => (
      (message += separator + value), API
    ),
    /**
     * Appends a separated by a space _value_ to the message.
     * The position of the invokation matters.
     *
     * @param {string} value - to be appended
     */
    phrase: (value) => API.text(value, Separator.Space),
    /**
     * Builds a line.
     *
     * @returns {string}
     */
    build: () =>
      transformers.reduce(
        (line, transform) => transform(line),
        prefix + message + suffix
      )
  };

  return API;
};

/**
 * Builder creator for building a multi-line message.
 * All methods except `build` and `pipe` can be chained.
 * The order of methods execution matters except
 * for some ones (see method description). The builder
 * will concatenate all lines in the declared order.
 */
const MessageBuilder = () => {
  const lines = [];

  const transformers = [];

  const API = {
    /**
     * Defines a maper which will modify
     * the final message. There is ability to
     * define multiple mapers. In that case,
     * the order of defining mapers describing
     * the order in which changes will be made.
     *
     * Note that it isn't the same order as the order of
     * the _text_ method.
     *
     * @param {Transformer} fn
     */
    map: (fn) => (transformers.push(fn), API),
    /**
     * Defines a line of the message.
     * The position in the message is defined by the
     * invokation order of the method.
     *
     * @param {string} text
     */
    line: (text) => (lines.push(text), API),
    /**
     * Pass lines to a _logger_ instance sequentially.
     * May be useful instead of the _build_ method.
     *
     * @param {Logger} logger
     */
    pipe: (logger) => lines.forEach((line) => logger(line)),
    /**
     * Joins all lines.
     *
     * @returns {string}
     */
    build: () =>
      transformers.reduce(
        (message, transform) => transform(message),
        lines.join(Separator.NewLine)
      )
  };

  return API;
};

/**
 * A pattern for the line which will contain
 * timestamp and execution time information.
 *
 * @param {Date} duration
 */
const StatusLine = (duration) =>
  LineBuilder()
    .text('Date:')
    .phrase(Typography.bold(timestamp()))
    .text(' - ')
    .text('Time:')
    .phrase(`~${Typography.bold(duration.getMilliseconds())}ms`)
    .map(Typography.gray);

exports.info = info;
exports.warn = warn;
exports.error = error;
exports.Separator = Separator;
exports.StatusLine = StatusLine;
exports.LineBuilder = LineBuilder;
exports.MessageBuilder = MessageBuilder;
