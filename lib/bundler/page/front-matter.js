const {cwd} = require('process');

const joi = require('joi');
const yaml = require('yaml');

const {Symbols} = require('../../logger/symbols.js');
const {Typography} = require('../../logger/colors.js');
const {
  Separator,
  LineBuilder,
  MessageBuilder,
  error: errorChannel
} = require('../../logger/index.js');

/**
 * Describes the shape of the front matter data that the user can write
 * at the top of the MD file.
 *
 * @typedef {Object} FrontMatter
 * @property {string} [title] - contains a title of the current page. It participates in creation
 *   of the <title> and "og:title" meta tags.
 * @property {string} [description] - contains a description of the current page. It participates in creation
 *   of the "description" and "og:description" meta tags.
 * @property {string[]} [keywords] - contains a list of keywords of the current page. Creates the "keywords"
 *   meta tag.
 * @property {string} [image] - contains the URL of the cover page image. Creates the "og:image" meta tag.
 * @property {string} [author] - contains the name of the page's author. Creates the "author" meta tag.
 * @property {string} [language] - contains the RFC 5646 language code. Creates the "og:locale" meta tag
 *   and defines the *lang* attribute of the `html` tag. If the attribute is explicitly defined, then it
 *   is not touched.
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
});

/**
 * Validates the front matter object.
 *
 * @param {FrontMatter} values
 * @param {import('../../files.js').IFile} file
 * @returns {boolean}
 */
const validateFrontMatter = (values, file) => {
  const {error} = frontMatterSchema.validate(values);

  if (error) {
    MessageBuilder()
      .line(
        LineBuilder()
          .text(Typography().red(Symbols.Cross))
          .phrase('The front matter does not corresponds to the schema:')
          .build()
      )
      .line(
        LineBuilder()
          .padStart(2, Separator.Space)
          .text('File:')
          .phrase(Typography().gray.bold(file.source().replace(cwd(), '')))
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
 * Builds the meta-object from the FrontMatter information.
 * The information of that object will be injected into the
 * document.
 *
 * @param {FrontMatter} frontMatter
 */
const prepare = (frontMatter) => ({
  draft: frontMatter.draft,
  html: {
    lang: frontMatter.language || null
  },
  tags: Object.entries(frontMatter)
    .reduce((content, [name, value]) => {
      switch (name) {
        case 'title':
          return content + `<title>${value}</title>\n<meta property="og:title" content="${value}">\n`;
        case 'description':
          return content + `<meta name="description" content="${value}">\n<meta property="og:description" content="${value}">\n`;
        case 'image':
          return content + `<meta property="og:image" content="${value}">\n`;
        case 'keywords':
          return content + `<meta name="keywords" content="${Array.isArray(value) ? value.join(', ') : value}"/>\n`;
        case 'author':
          return content + `<meta name="author" content="${value}">\n`;
        case 'language':
          return content + `<meta property="og:locale" content="${value}">\n`;
        default:
          return content;
      }
    }, '')
});

/** @typedef {ReturnType<typeof prepare>} Meta */

/**
 * Parses and validates a front matter text.
 * If the data is correct then the function returns
 * the {@link FrontMatter} object, otherwise `null`.
 *
 * @param {string} text
 * @param {import('../../files.js').IFile} file
 * @returns {Meta|null}
 */
exports.parseFrontMatter = (text, file) => {
  const frontMatter = yaml.parse(text);

  return validateFrontMatter(frontMatter, file) ? prepare(frontMatter) : null;
};
