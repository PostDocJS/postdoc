import {inspect} from 'node:util';

import {marked} from 'marked';

import {Typography} from '../../logger/colors.js';
import {MessageBuilder, LineBuilder, error} from '../../logger/index.js';

/**
 * Compiles the Markdown file.
 *
 * @param {string} content
 * @param {string} filename
 * @returns {Future<string, never>}
 */
export const compileMarkdown = async (content, filename) => {
  try {
    return marked.parse(content);
  } catch (err) {
    MessageBuilder()
      .line(
        LineBuilder()
          .text('The compilation of the')
          .phrase(Typography().bold(filename))
          .phrase('ends with a failure:')
          .build()
      )
      .line(inspect(err))
      .pipe(error);

    return '';
  }
};
