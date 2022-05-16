/**
 * @file This module encapsulates internal methods and instances,
 * that is used to pass text to the stdout and stderr.

 * Because we support colors that file reexports formatters
 * that allow to colorize the output.
 *
 * @module logger
 * @requires module:configuration
 */

const {timestamp} = require('./date.js');
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
 * Logger creator.
 *
 * @param {string} level
 */
const log =
  (level) =>
    /**
     * Logger function. All passed values may be
     * preprocessed and stringified before concatenating
     * with statics.
     *
     * @param {TemplateStringsArray} statics
     * @param {*[]} values
     */
    (statics, ...values) => {
      if (Configuration.logger.quiet) {
        return;
      }

      const message = statics.reduce(
        (accumulator, part, index) =>
          accumulator + part + (index === values.length ? '' : values[index]),
        ''
      );

      // eslint-disable-next-line no-console
      console[level](timestamp(), message);
    };

exports.info = log(LoggerLevel.INFO);
exports.warn = log(LoggerLevel.WARNING);
exports.error = log(LoggerLevel.ERROR);
