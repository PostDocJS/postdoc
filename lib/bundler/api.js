/**
 * @file is responsible for finding, parsing and structuring data
 *  for API pages.
 *
 * @module api
 */

import {inspect} from 'node:util';
import {basename, resolve, sep} from 'node:path';

import {Directory} from '../files.js';
import {Option} from '../utils/option.js';
import {Symbols} from '../logger/symbols.js';
import {memo, toArray} from '../utils/fp.js';
import {Typography} from '../logger/colors.js';
import {Container} from '../utils/container.js';
import {CONFIGURATION_ID} from '../configuration/index.js';
import {error as logError, LineBuilder, MessageBuilder} from '../logger/index.js';

/**
 * Reads all files that may contain comments for the API extractor tool.
 *
 * @param {Array<string>} bases
 * @returns {readonly import('../files.js').IFile[]}
 */
const collectApiFiles = (bases) =>
  bases
    .flatMap(
      (directoryPath) => Directory(resolve(directoryPath))
        .recursive(true)
        .files()
        .filter((file) => !file.source().includes(`${sep}_`))
    );

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
 * @property {string} example
 * @property {string} w3c
 * @property {string} jsonWire
 * @property {string|null} moreInfo
 * @property {number} sortIndex
 * @property {string|null} kind
 * @property {string} description
 */

/**
 * Object that contains the parsed non-structural comments.
 *
 * @typedef {Object} APIFile
 * @property {readonly APIComment[]} comments
 * @property {string} path - File's absolute path.
 */

/**
 * Object that contains the parsed structured comments.
 *
 * @typedef {Object} StructuredAPIFile
 * @property {readonly ParsedAPIComment[]} entities
 * @property {string} file - File's absolute path.
 */

/**
 * Extracts a task to extract all document comments, parse and structure it.
 *
 * @param {import('../files.js').IFile} file
 * @returns {Future<APIFile, Error>}
 */
const extractAPI = async (file) => {
  const parseComments = await getAPIExtractorTool();

  return file
    .content()
    .then(parseComments(file))
    .then((comments) => ({comments, path: file.source()}));
};

/**
 * @returns {Promise<(file: import('../files.js').IFile) => (code: string) => readonly APIComment[]>} a function that returns an extractor function
 *  based on the `apiExtractor` config value.
 */
const getAPIExtractorTool = async () => {
  const {apiExtractor} = Container.get(CONFIGURATION_ID);

  const explicitOptionsPassed = typeof apiExtractor !== 'string';

  const key = !explicitOptionsPassed
    ? apiExtractor
    : Object.keys(apiExtractor).some((name) => name === 'dox')
      ? 'dox'
      : '@microsoft/api-extractor';

  const options = explicitOptionsPassed ? apiExtractor[key] || {} : {};

  switch (apiExtractor) {
    case 'dox': {
      const {parseComments} = await import('dox');

      return (file) => (code) => {
        try {
          return parseComments(code, {...options, skipSingleStar: true});
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

          return [];
        }
      };
    }
    // case '@microsoft/api-extractor': return require('@microsoft/api-extractor')
  }
};

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
  RETURNS: 'returns',
  FUNCTION: 'function',
  INTERNAL: 'internal',
  EDIT_LINE: 'editline',
  JSON_WIRE: 'jsonwire',
  MORE_INFO: 'moreinfo',
  SORT_INDEX: 'sortIndex',
  DESCRIPTION: 'description'
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
  RETURNS: 'returns',
  API_NAME: 'apiName',
  INTERNAL: 'internal',
  EDIT_LINE: 'editLine',
  JSON_WIRE: 'jsonWire',
  MORE_INFO: 'moreInfo',
  SORT_INDEX: 'sortIndex',
  PARAMETERS: 'parameters',
  DESCRIPTION: 'description'
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
  [API_TEMPLATE.EXAMPLE]: '',
  [API_TEMPLATE.W3C]: '',
  [API_TEMPLATE.JSON_WIRE]: '',
  [API_TEMPLATE.MORE_INFO]: null,
  [API_TEMPLATE.SORT_INDEX]: 0,
  [API_TEMPLATE.DESCRIPTION]: ''
});

/**
 * @param {string} path
 * @returns {(comments: Array<APIComment>) => Array<ParsedAPIComment>}
 */
const createCommentParser = (path) =>
  (comments) =>
    comments
      .filter(({ignore}) => !ignore)
      .map(comment =>
        comment.tags.reduce((result, tag) => {
          result.name = result.name || comment.ctx?.name || basename(path);
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
              return {
                ...result,
                [API_TEMPLATE.LINK]: tag.string.replace(/\/+/g, '').replace(/:/g, '').toLowerCase()
              };
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
              return {...result, [API_TEMPLATE.API]: tag.visibility};
            }
            case DOC_TAGS.EDIT_LINE: {
              return {...result, [API_TEMPLATE.EDIT_LINE]: tag.editline};
            }
            case DOC_TAGS.ALIAS: {
              return {
                ...result,
                [API_TEMPLATE.ALIASES]: result.aliases.concat([tag.string])
              };
            }
            case DOC_TAGS.DISPLAY: {
              return {...result, [API_TEMPLATE.API_NAME]: tag.string};
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
                  type: normalizeTypes(tag.types),
                  description: tag.description || ''
                }
              };
            }
            case DOC_TAGS.SINCE: {
              return {...result, [API_TEMPLATE.SINCE]: tag.string};
            }
            case DOC_TAGS.INTERNAL: {
              return {...result, [API_TEMPLATE.INTERNAL]: true};
            }
            case DOC_TAGS.EXAMPLE: {
              return {...result, [API_TEMPLATE.EXAMPLE]: tag.string};
            }
            case DOC_TAGS.W3C: {
              return {...result, [API_TEMPLATE.W3C]: tag.string};
            }
            case DOC_TAGS.JSON_WIRE: {
              return {...result, [API_TEMPLATE.JSON_WIRE]: tag.string};
            }
            case DOC_TAGS.MORE_INFO: {
              return {...result, [API_TEMPLATE.MORE_INFO]: tag.string};
            }
            case DOC_TAGS.SORT_INDEX: {
              return {...result, [API_TEMPLATE.SORT_INDEX]: Number(tag.string)};
            }
            case DOC_TAGS.DESCRIPTION: {
              return {...result, [API_TEMPLATE.DESCRIPTION]: tag.string};
            }
            default: {
              return result;
            }
          }
        }, createEmptyParsedAPIComment())
      );

/**
 * Parse and structure API files.
 *
 * @param {readonly APIFile[]} files
 * @returns {readonly StructuredAPIFile[]}
 */
const parseApiFiles = (files) =>
  files
    // Filter to reject files that do not contain a doc comment
    .filter(({comments}) => comments[0].codeStart)
    .map(({comments, path}) =>
      ({file: path, entities: createCommentParser(path)(comments)})
    );

// FIXME: Implementing --watch for the API is not so straightforward as for
// regular assets. It is unclear where API is used and where is not. So,
// small change in the external package will cause rebuild of the whole
// project. That is bad for big projects. Until that problem is solved, we
// will assume that API data is constant and doesn't change over time.
/**
 * Builds the API data based on the code's comments.
 *
 * @returns {Promise<readonly StructuredAPIFile[]>}
 */
export const resolveAPI = memo(async () => {
  const {directories} = Container.get(CONFIGURATION_ID);

  const files = Option(directories.api)
    .map(toArray)
    .map(collectApiFiles)
    .extract(() => []);

  return Promise.all(
    files.map(extractAPI)
  ).then(
    parseApiFiles,
    (error) => {
      MessageBuilder()
        .line(LineBuilder().text('Something went wrong:').map(Typography().red).build())
        .line(Typography().red(error.toString()))
        .pipe(logError);

      return [];
    }
  );
});
