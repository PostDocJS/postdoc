/**
 * @file contains the definition of the EJS compiler.
 *
 * @module compile-ejs
 */

const process = require('process');

const ejs = require('ejs');

const {Future} = require('../utils/future.js');
const {Typography} = require('../logger/colors.js');
const {MessageBuilder, LineBuilder, error: logError} = require('../logger/index.js');

/**
 * Renders EJS template with a given data.
 * Handles errors occurred while compilation.
 *
 * @param {string} content
 * @param {Object} data
 * @param {ejs.Options & {filename: string}} options 
 */
exports.compileEjs = (content, data, {filename, ...options}) =>
  Future(
    (succeed, fail) =>
      ejs.render(content, data, {async: true, ...options})
        .catch((error) => {
          MessageBuilder()
            .line(
              LineBuilder()
                .text('An error occurred while rendering')
                .phrase(Typography().bold(filename.replace(process.cwd(), '')))
                .phrase('template.')
                .map(Typography().red)
                .build()
            )
            .line(Typography().red(error.toString()))
            .pipe(logError);
    
          return '';
        })
        .then(succeed, fail)
  );
