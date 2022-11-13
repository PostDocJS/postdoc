const {inspect} = require('util');

const {marked} = require('marked');

const {Typography} = require('../../logger/colors.js');
const {parseFrontMatter} = require('./front-matter.js');
const {MessageBuilder, LineBuilder, error} = require('../../logger/index.js');

const FRONT_MATTER_AND_CONTENT_RE = /^\s*(?:---(.*?)---)?(.*)$/s;

/**
 * Extracts the front matter block and the actual content from the MD file if it exists.
 *
 * @param {string} content
 * @returns {[string|null,string]}
 */
const splitFrontMatterAndContent = (content) => {
  const extractedParts = FRONT_MATTER_AND_CONTENT_RE.exec(content);

  if (extractedParts && extractedParts[1]) {
    const [, frontMatter, content] = extractedParts;

    return [frontMatter.trim(), content.trim()];
  }

  return [null, content];
};

/**
 * Describes options that are accepted by the {@link compileMarkdown} function.
 *
 * @typedef {Object} CompileMarkdownOptions
 * @property {boolean} [withFrontMatter=false] Determines whether the front matter data should
 *   be compiled.
 */

/**
 * Compiles the Markdown file.
 * It will compile files with or without the front matter data.
 * Provide {@link CompileMarkdownOptions} in order to handle the front matter.
 *
 * @param {import('../../files.js').IFile} file
 * @param {CompileMarkdownOptions} [options={}]
 * @returns {Promise<[import('./front-matter.js').FrontMatter|null, string]>}
 */
exports.compileMarkdown = (file, {withFrontMatter= false} = {}) =>
  file
    .map(splitFrontMatterAndContent)
    .map(
      ([frontMatter, content]) => [
        withFrontMatter && frontMatter ? parseFrontMatter(frontMatter, file) : null,
        marked.parse(content)
      ]
    )
    .content()
    .run()
    .then((result) =>
      result.extract((err) => {
        MessageBuilder()
          .line(
            LineBuilder()
              .text('The compilation of the')
              .phrase(Typography().bold(file.source()))
              .phrase('ends with a failure:')
              .build()
          )
          .line(inspect(err))
          .pipe(error);

        return [null, ''];
      })
    );
