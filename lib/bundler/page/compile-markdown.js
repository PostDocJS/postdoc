import {inspect} from 'node:util';

import {marked} from 'marked';

import {Typography} from '../../logger/colors.js';
import {parseFrontMatter} from './front-matter.js';
import {MessageBuilder, LineBuilder, error} from '../../logger/index.js';

const FRONT_MATTER_AND_CONTENT_RE = /^\s*(?:---(.*?)---)?(.*)$/s;

/**
 * Extracts the front matter block and the actual content from the MD file if it exists.
 *
 * @param {string} content
 * @returns {[string | null, string]}
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
 * @returns {Future<[import('./front-matter.js').FrontMatter|null, string], never>}
 */
export const compileMarkdown = async (file, {withFrontMatter = false} = {}) =>
  file
    .map(splitFrontMatterAndContent)
    .map(
      ([frontMatter, content]) => [
        withFrontMatter && frontMatter ? parseFrontMatter(frontMatter, file) : null,
        marked.parse(content)
      ]
    )
    .content()
    .catch((err) => {
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
    });
