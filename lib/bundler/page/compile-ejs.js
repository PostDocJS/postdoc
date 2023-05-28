/**
 * @file contains the definition of the EJS compiler.
 *
 * @module compile-ejs
 */

import {cwd} from 'node:process';
import {inspect} from 'node:util';

import {renderAsync} from 'ejs';

import {Typography} from '../../logger/colors.js';
import {
  error,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

/**
 * Renders EJS template with a given data.
 * Handles errors occurred while compilation.
 *
 * @param {string} content
 * @param {Object} data
 * @param {ejs.Options & {filename: string}} options 
 * @returns {Future<string, never>}
 */
export const compileEjs = async (content, data, {filename, Config, ...options}) => {
  data.Config = Config;

  return renderAsync(content, data, {async: true, ...options})
    .then((result) => {
      return result;
    })
    .catch((err) => {
      MessageBuilder()
        .line(
          LineBuilder()
            .text('An error occurred while rendering')
            .phrase(Typography().bold(filename.replace(cwd(), '')))
            .phrase('template.')
            .map(Typography().red)
            .build()
        )
        .line(Typography().red(inspect(err)))
        .pipe(error);

      return '';
    });
};
