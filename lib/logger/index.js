// This module encapsulates internal methods and instances,
// that is used to pass text to the stdout and stderr.
//
// Because we support colors that file reexports formatters
// that allow to colorize the output.

const chalk = require('chalk');

const LogLevel = {
  INFO: 'info_level',
  WARNING: 'warning_level',
  ERROR: 'error_level'
};

const log =
  (level) =>
    (statics, ...values) => {
      const message = statics.reduce(
        (accumulator, part, index) =>
          accumulator + part + (index === values.length ? '' : values[index]),
        ''
      );

      switch (level) {
        case LogLevel.INFO:
          console.log(message);
          break;
        case LogLevel.WARNING:
          console.warn(message);
          break;
        case LogLevel.ERROR:
          console.error(message);
          break;
        default:
          console.log(message);
	  break;
      }
    };

exports.info = log(LogLevel.INFO);
exports.warn = log(LogLevel.WARNING);
exports.error = log(LogLevel.ERROR);

/** This color should be used to emphasize the content's importance. */
exports.emphasize = chalk.green.bind(chalk);
