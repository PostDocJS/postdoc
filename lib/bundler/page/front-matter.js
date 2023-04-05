import {cwd} from 'node:process';

import joi from 'joi';
import {parse} from 'yaml';

import {Symbols} from '../../logger/symbols.js';
import {Typography} from '../../logger/colors.js';
import {
  Separator,
  LineBuilder,
  MessageBuilder,
  error as errorChannel
} from '../../logger/index.js';

/**
 * Describes the shape of the front matter data that the user can write
 * at the top of the MD file.
 *
 * @typedef {Object} FrontMatter
 * @property {string} [title] - contains a title of the current page.
 * @property {string} [description] - contains a description of the current page.
 * @property {string[]} [keywords] - contains a list of keywords of the current page.
 * @property {string} [image] - contains the URL of the cover page image.
 * @property {string} [author] - contains the name of the page's author.
 * @property {string} [language] - contains the RFC 5646 language code.
 *   Defines the *lang* attribute of the `html` tag. If the attribute is explicitly defined, then it is not touched.
 * @property {boolean} [draft] - signals whether the page is finished. Pages with `draft: true` will be built
 *   in development, but not in production.
 * @property {string} [last_updated] - the ISO string Date of the last file update.
 */

const frontMatterSchema = joi.object({
  title: joi.string(),
  description: joi.string(),
  keywords: joi.array().items(joi.string()),
  image: joi.string().uri({}),
  author: joi.string(),
  language: joi.string(),
  draft: joi.boolean(),
  last_updated: joi.string().isoDate()
}).unknown(true);

/**
 * Validates the front matter object.
 *
 * @param {FrontMatter} values
 * @param {string} fileName
 * @returns {boolean}
 */
const checkFrontMatter = (values, fileName) => {
  const {error} = frontMatterSchema.validate(values);

  if (error) {
    MessageBuilder()
      .line(
        LineBuilder()
          .text(Typography().red(Symbols.Cross))
          .phrase('The front matter contains an invalid known property:')
          .build()
      )
      .line(
        LineBuilder()
          .padStart(2, Separator.Space)
          .text('File:')
          .phrase(Typography().gray.bold(fileName.replace(cwd(), '')))
          .build()
      )
      .line(
        error.details
          .map(({message}) =>
            LineBuilder().padStart(2, Separator.Space).text(Typography().red(message)).build()
          )
          .join('\n')
      )
      .pipe(errorChannel);

    return false;
  }

  return true;
};

/**
 * Parses and validates a front matter text.
 * If the data is correct then the function returns
 * the {@link FrontMatter} object, otherwise `null`.
 *
 * @param {string} text
 * @param {string} fileName
 * @returns {FrontMatter}
 */
export const parseFrontMatter = (text, fileName) => {
  const frontMatter = parse(text);

  checkFrontMatter(frontMatter, fileName);
  
  return frontMatter;
};

const FRONT_MATTER_AND_CONTENT_RE = /^\s*(?:---(.*?)---)?(.*)$/s;

/**
 * Extracts the front matter block and the actual content from the file if it exists.
 *
 * @param {string} content
 * @returns {[string | null, string]}
 */
export const splitFrontMatterAndContent = (content) => {
  const extractedParts = FRONT_MATTER_AND_CONTENT_RE.exec(content);

  if (extractedParts && extractedParts[1]) {
    const [, frontMatter, content] = extractedParts;

    return [frontMatter.trim(), content.trim()];
  }

  return [null, content];
};

