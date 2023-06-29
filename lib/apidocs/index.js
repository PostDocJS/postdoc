import {exit} from 'node:process';
import {inspect} from 'node:util';
import {resolve, sep} from 'node:path';

import List from '@halo-lab/list';
import Future from '@halo-lab/future';
import {pipe, pipeWith} from 'pipe-ts';

import {not} from '../utils/fp.js';
import {Symbols} from '../logger/symbols.js';
import {isPartial} from '../bundler/page/entity.js';
import {Typography} from '../logger/colors.js';
import {EJS_EXTENSION} from '../constants.js';
import {Directory, File} from '../files.js';
import {LineBuilder, MessageBuilder} from '../logger/index.js';

/**
 * Description object at the entity level (without the @description tag)
 *
 * @typedef {Object} APICommentDescription
 * @property {string} full
 * @property {string} summary
 * @property {string} body
 */

/**
 * The CTX (.ctx) object indicates the context of the code block, is it a method, a function, a variable etc
 *
 * @typedef {boolean|Object} APICommentCTX
 * @property {string} name
 */

/**
 * Object that describes every parsed document comment.
 *
 * @typedef {Object} APIComment
 * @property {readonly APICommentTag[]} tags
 * @property {boolean} ignore
 * @property {APICommentDescription} description
 * @property {APICommentCTX} ctx
 */

/**
 * @typedef {Object} APICommentTag
 * @property {string} type
 * @property {string} string
 * @property {string} description
 * @property {string} visibility
 * @property {string} html
 * @property {string} name
 * @property {string} editline
 * @property {readonly string[]} types
 */

/**
 * @typedef {Object} ParsedAPICommentParameter
 * @property {string} name
 * @property {boolean} optional
 * @property {string} types
 * @property {string} description
 */

/**
 * @typedef {Object} ParsedAPICommentReturns
 * @property {string} type
 * @property {string} description
 */

/**
 * Object that is suitable to build a documentation UI.
 *
 * @typedef {Object} ParsedAPIComment
 * @property {string} name
 * @property {string} link
 * @property {Array<ParsedAPICommentParameter>} parameters
 * @property {string} api - States visibility of the API member.
 * @property {string} editLine
 * @property {readonly string[]} aliases
 * @property {string|null} apiName
 * @property {Array<string>} syntax
 * @property {Array<string>} see
 * @property {ParsedAPICommentReturns|null} returns
 * @property {string|null} since
 * @property {boolean} internal
 * @property {Array<string>} example
 * @property {Array<string>} tsexample
 * @property {string} exampleLink
 * @property {string} w3c
 * @property {string} jsonWire
 * @property {number} sortIndex
 * @property {string|null} kind
 * @property {string} description
 */

/**
 * Sometimes `dox` returns tags whose _types_ property isn't an array though it is
 * supposed to be.
 *
 * @param {Array<string>|string} types
 * @returns {string}
 */
const normalizeTypes = (types) => Array.isArray(types) ? types.join(' | ') : types;

/**
 * @template T
 * @typedef {Object} ParsedAPIContainer
 * @property {string} type
 * @property {T} value
 */

/**
 * @typedef {Object} ParseAPICommentReducerOptions
 * @property {APICommentTag} tag
 * @property {APIComment} comment
 * @property {string} filePath
 */

/**
 * Checks whether parameter member is optional or not.
 *
 * @param {string} name
 * @returns {boolean}
 */
const isParamOptional = (name) => name.startsWith('[') && name.endsWith(']');

const DOC_TAGS = Object.freeze({
  API: 'api',
  SEE: 'see',
  W3C: 'w3c',
  FUNC: 'func',
  NAME: 'name',
  LINK: 'link',
  KIND: 'kind',
  ALIAS: 'alias',
  PARAM: 'param',
  SINCE: 'since',
  METHOD: 'method',
  SYNTAX: 'syntax',
  RETURN: 'return',
  DISPLAY: 'display',
  EXAMPLE: 'example',
  TSEXAMPLE: 'tsexample',
  RETURNS: 'returns',
  FUNCTION: 'function',
  INTERNAL: 'internal',
  EDIT_LINE: 'editline',
  JSON_WIRE: 'jsonwire',
  SORT_INDEX: 'sortIndex',
  DESCRIPTION: 'description',
  EXAMPLE_LINK: 'exampleLink'
});

const API_TEMPLATE = Object.freeze({
  API: 'api',
  SEE: 'see',
  W3C: 'w3c',
  NAME: 'name',
  LINK: 'link',
  KIND: 'kind',
  SINCE: 'since',
  SYNTAX: 'syntax',
  ALIASES: 'aliases',
  EXAMPLE: 'example',
  TSEXAMPLE: 'tsexample',
  RETURNS: 'returns',
  API_NAME: 'apiName',
  INTERNAL: 'internal',
  EDIT_LINE: 'editLine',
  JSON_WIRE: 'jsonWire',
  SORT_INDEX: 'sortIndex',
  PARAMETERS: 'parameters',
  DESCRIPTION: 'description',
  EXAMPLE_LINK: 'exampleLink'
});

/** @returns {ParsedAPIComment} */
const createEmptyParsedAPIComment = () => ({
  [API_TEMPLATE.NAME]: '',
  [API_TEMPLATE.LINK]: '',
  [API_TEMPLATE.PARAMETERS]: [],
  [API_TEMPLATE.API]: '',
  [API_TEMPLATE.EDIT_LINE]: '',
  [API_TEMPLATE.ALIASES]: [],
  [API_TEMPLATE.API_NAME]: null,
  [API_TEMPLATE.SYNTAX]: [],
  [API_TEMPLATE.SEE]: [],
  [API_TEMPLATE.KIND]: null,
  [API_TEMPLATE.RETURNS]: null,
  [API_TEMPLATE.SINCE]: null,
  [API_TEMPLATE.INTERNAL]: false,
  [API_TEMPLATE.EXAMPLE]: [],
  [API_TEMPLATE.TSEXAMPLE]: [],
  [API_TEMPLATE.W3C]: '',
  [API_TEMPLATE.JSON_WIRE]: '',
  [API_TEMPLATE.SORT_INDEX]: 0,
  [API_TEMPLATE.DESCRIPTION]: '',
  [API_TEMPLATE.EXAMPLE_LINK]: ''
});

/**
 * @param {import('../files.js').IFile} file
 * @param {import('../configuration/defaults.js').Configuration} configuration
 * @returns {(comment: APIComment) => ParsedAPIComment}
 */
const createCommentParserFor = (file, configuration) =>
  (comment) =>
    comment.tags.reduce((result, tag) => {
      result.name = result.name || comment.ctx?.name || file.name();
      result.description = result.description || comment.description.full;

      switch (tag.type) {
        case DOC_TAGS.NAME:
        case DOC_TAGS.KIND:
        case DOC_TAGS.FUNC:
        case DOC_TAGS.METHOD:
        case DOC_TAGS.FUNCTION: {
          const nameTag = comment.tags.filter((tag) =>
            [DOC_TAGS.NAME, DOC_TAGS.METHOD, DOC_TAGS.FUNCTION, DOC_TAGS.FUNC].includes(tag.type)
          ).pop();

          const kindTag = comment.tags.filter((tag) =>
            [DOC_TAGS.KIND, DOC_TAGS.METHOD, DOC_TAGS.FUNCTION, DOC_TAGS.FUNC].includes(tag.type)
          ).pop();

          return {
            ...result,
            [API_TEMPLATE.NAME]: nameTag?.string || result.name,
            [API_TEMPLATE.KIND]: [DOC_TAGS.METHOD, DOC_TAGS.FUNCTION, DOC_TAGS.FUNC].includes(kindTag?.type)
              ? DOC_TAGS.FUNCTION
              : kindTag?.string || result.kind
          };
        }
        case DOC_TAGS.LINK: {
          return { ...result, [API_TEMPLATE.LINK]: tag.string };
        }
        case DOC_TAGS.PARAM: {
          const optional = isParamOptional(tag.name);

          return {
            ...result,
            [API_TEMPLATE.PARAMETERS]: result.parameters.concat([
              {
                name: optional ? tag.name.slice(1, -1) : tag.name,
                optional,
                description: tag.description,
                types: normalizeTypes(tag.types)
              }
            ])
          };
        }
        case DOC_TAGS.API: {
          return { ...result, [API_TEMPLATE.API]: tag.visibility };
        }
        case DOC_TAGS.EDIT_LINE: {
          return { ...result, [API_TEMPLATE.EDIT_LINE]: tag.editline };
        }
        case DOC_TAGS.ALIAS: {
          return {
            ...result,
            [API_TEMPLATE.ALIASES]: result.aliases.concat([tag.string])
          };
        }
        case DOC_TAGS.DISPLAY: {
          return { ...result, [API_TEMPLATE.API_NAME]: tag.string };
        }
        case DOC_TAGS.SYNTAX: {
          return {
            ...result,
            [API_TEMPLATE.SYNTAX]: result.syntax.concat([tag.string])
          };
        }
        case DOC_TAGS.SEE: {
          return {
            ...result,
            [API_TEMPLATE.SEE]: result.see.concat([tag.string])
          };
        }
        case DOC_TAGS.RETURN:
        case DOC_TAGS.RETURNS: {
          return {
            ...result,
            [API_TEMPLATE.RETURNS]: {
              type: normalizeTypes(tag.types).replace('[object Object]', '*'),
              description: tag.description || ''
            }
          };
        }
        case DOC_TAGS.SINCE: {
          return { ...result, [API_TEMPLATE.SINCE]: tag.string };
        }
        case DOC_TAGS.INTERNAL: {
          return { ...result, [API_TEMPLATE.INTERNAL]: true };
        }
        case DOC_TAGS.EXAMPLE: {
          return {
            ...result,
            [API_TEMPLATE.EXAMPLE]: result.example.concat([tag.string])
          };
        }
        case DOC_TAGS.TSEXAMPLE: {
          return {
            ...result,
            [API_TEMPLATE.TSEXAMPLE]: result.tsexample.concat([tag.string])
          };
        }
        case DOC_TAGS.W3C: {
          return { ...result, [API_TEMPLATE.W3C]: tag.string };
        }
        case DOC_TAGS.JSON_WIRE: {
          return { ...result, [API_TEMPLATE.JSON_WIRE]: tag.string };
        }
        case DOC_TAGS.SORT_INDEX: {
          return { ...result, [API_TEMPLATE.SORT_INDEX]: Number(tag.string) };
        }
        case DOC_TAGS.DESCRIPTION: {
          return { ...result, [API_TEMPLATE.DESCRIPTION]: tag.string };
        }
        case DOC_TAGS.EXAMPLE_LINK: {
          return { ...result, [API_TEMPLATE.EXAMPLE_LINK]: tag.string };
        }
        default: {
          const parseTag = configuration.apidocs.tags[tag.type];

          if (parseTag) {
            const maybeParsedTag = parseTag(tag, comment, result);

            return maybeParsedTag
              ? {...result, ...maybeParsedTag}
              : result;
          }

          return result;
        }
      }
    }, createEmptyParsedAPIComment());

/**
 * Returns the configured API Extractor.
 *
 * @param {import('../configuration/defaults.js').Configuration} configuration
 * @returns {Future.Self<(filePair: [import('../files.js').IFile, string]) => [import('../files.js').IFile, readonly APIComment[]]>}
 */
const getAPIExtractor = pipe(
  ({ apiExtractor }) => {
    const maybeExtractorWithOptions = typeof apiExtractor !== 'string';

    // TODO: if apiExtractorInformation contains unsupported comment processing tool,
    // give a warning about it.

    const extractorName = maybeExtractorWithOptions
      ? 'dox' in apiExtractor
        ? 'dox'
        : '@microsoft/api-extractor'
      : apiExtractor;

    const extractorOptions = maybeExtractorWithOptions ? apiExtractor[extractorName] || {} : {};

    return [extractorName, extractorOptions];
  },
  Future.of,
  Future.map(([extractorName, extractorOptions]) => Future.merge(
    extractorName,
    extractorOptions,
    import(extractorName)
  )),
  Future.map(([_extractorName, extractorOptions, { parseComments }]) =>
    ([file, code]) => {
      try {
        return [file, parseComments(
          code,
          { ...extractorOptions, skipSingleStar: true }
        )];
      } catch (error) {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Cross)
              .phrase('An error occurred while compiling')
              .phrase(Typography().bold(file.source()))
              .build()
          )
          .line(inspect(error))
          .map(Typography().red)
          .pipe(logError);

        exit(1);
      }
    }
  )
);

/**
 * @param {string} templatePath
 * @returns {Future.Self<string, never>}
 */
const getTemplateFile = pipe(
  resolve,
  File,
  (file) => file.content()
);

/**
 * Stringifies the objects, array and privitive values, so they can
 * be written to a file and parsed without any errors.
 *
 * @param {unknown} value
 * @returns {string}
 */
const stringify = (value) =>
  Array.isArray(value)
    ? `[${value.map(stringify).join(', ')}]`
    : value && typeof value === 'object'
      ? '{\n' + Object.entries(value)
        .map(([key, value]) => `${key}: ${stringify(value)}`)
        .join(', ') + '}'
      : typeof value === 'string'
        ? JSON.stringify(value)
        : String(value);

/**
 * Stringifies ApiDoc file to be inserted into a template file.
 *
 * @param {Object} apiDocFile
 * @returns {string}
 */
const stringifyApiDocFile = ({ file, entity }) =>
  '<%\n' +
  `const filePath = "${file}";\n` +
  `const apiEntity = ${stringify(entity)};\n` +
  '%>\n';

/**
 * @param {Future.Self<string, never>} templateContent
 * @returns {Future.Self<(apiFile: Object) => Object>}
 */
const createApiDocFile = (templateContent) => pipe(
  (apiFile) => Future.merge(apiFile, templateContent),
  Future.map(([apiFile, templateContent]) => ({
    file: apiFile.file,
    content: `${stringifyApiDocFile(apiFile)}${templateContent}`
  }))
)

/**
 * @param {import('../configuration/defaults.js').Configuration} configuration
 * @param {string} outputDirectoryName
 * @param {string} sourceDirectory
 * @returns {(apiFile: Object) => Object}
 */
const createOutputPathResolver = (configuration, outputDirectoryName, sourceDirectory) =>
  pipe(
    ({file, content}) => ({file: file.replace(File(file).extension(), EJS_EXTENSION), content}),
    ({file, content}) => ({file: file.replace(`${resolve(sourceDirectory)}${sep}`, ''), content}),
    ({file, content}) => ({
      file: resolve(
        configuration.directories.pages,
        outputDirectoryName,
        file
      ),
      content
    })
  );

/**
 * @param {import('../configuration/defaults.js').Configuration} configuration
 * @param {string} sourceDirectory
 * @param {string} outputDirectoryName
 * @param {string} templatePath
 * @returns {Future.Self<void, Error>}
 */
export const generateApiDocFiles = (
  configuration,
  sourceDirectory,
  outputDirectoryName,
  templatePath
) => pipeWith(
  sourceDirectory,
  resolve,
  Directory,
  (directory) => directory.recursive(true).files(),
  List.from,
  List.filter(not(isPartial)),
  List.map((file) =>
    Future.merge(
      file,
      file.content()
    )
  ),
  List.map(Future.apply(getAPIExtractor(configuration))),
  Future.merge,
  Future.map(pipe(
    List.from,
    List.map(([file, comments]) => ([
      file,
      // Leave only comments that are not empty and not ignored.
      comments.filter((comment) => !comment.ignore && comment.codeStart)
    ])),
    // Leave only files with comments.
    List.filter(([_file, comments]) => comments.length),
    List.map(([file, comments]) => [
      file.source(),
      comments.map(createCommentParserFor(file, configuration))
    ]),
    List.chain(([file, entities]) =>
      entities.map((entity) => ({ file, entity }))
    ),
    List.map(createApiDocFile(getTemplateFile(templatePath)))
  )),
  Future.map(Future.merge),
  Future.map(pipe(
    List.from,
    List.map(createOutputPathResolver(configuration, outputDirectoryName, sourceDirectory)),
    List.map(({ file, content }) =>
      File()
        .map(() => content)
        .write(file)
    ),
    Future.merge
  ))
);