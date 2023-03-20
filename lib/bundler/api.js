/**
 * @file is responsible for finding, parsing and structuring data
 *  for API pages.
 *
 * @module api
 */

import {inspect} from 'node:util';
import {resolve, sep, basename} from 'node:path';

import {Option} from '../utils/option.js';
import {Symbols} from '../logger/symbols.js';
import {Directory} from '../files.js';
import {Container} from '../utils/container.js';
import {Typography} from '../logger/colors.js';
import {CONFIGURATION_ID} from '../configuration/index.js';
import {MessageBuilder, LineBuilder, error as logError} from '../logger/index.js';
import {memo, biExecutor, toArray} from '../utils/fp.js';

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
 * Object that describes every parsed document comment.
 *
 * @typedef {Object} APIComment
 * @property {readonly APICommentTag[]} tags
 * @property {boolean} ignore
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
 * @returns {Promise<() => readonly APIComment[]>} a function that returns an extractor function
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
 * @template T
 * @param {string} type
 * @param {T} value
 * @returns {ParsedAPIContainer<T>}
 */
const createParsedAPIContainer = (type, value) => ({type, value});

/**
 * @typedef {Object} ParseAPICommentReducerOptions
 * @property {APICommentTag} tag
 * @property {APIComment} comment
 * @property {string} filePath
 */

/**
 * Parses a name of the doc member.
 *
 * @param {Partial<ParsedAPIComment>} result
 * @param {ParseAPICommentReducerOptions} options
 * @returns {Partial<ParsedAPIComment>}
 */
const parseName = biExecutor(
  () => true,
  ({comment, filePath}) => {
    const methodTag = comment.tags.find((tag) => tag.type === 'method');

    const name = methodTag?.string || comment.ctx?.name || basename(filePath);

    return createParsedAPIContainer('name', name);
  }
);

/** Parses a link used in the doc member. */
const parseLink = biExecutor(
  ({tag}) => tag.type === 'link',
  ({tag}) => createParsedAPIContainer('link', tag.string.replace(/\/+/g, '').replace(/:/g, '').toLowerCase())
);

/**
 * Checks whether parameter member is optional or not.
 *
 * @param {string} name
 * @returns {boolean}
 */
const isParamOptional = (name) => name.startsWith('[') && name.endsWith(']');

/** Parses a parameter of the function member. */
const parseParameter = biExecutor(
  ({tag}) => tag.type === 'param',
  ({tag}) => {
    const optional = isParamOptional(tag.name);

    return createParsedAPIContainer('parameters', [
      {
        name: optional ? tag.name.slice(1, -1) : tag.name,
        optional,
        description: tag.description,
        types: normalizeTypes(tag.types)
      }
    ]);
  }
);

/** Parses a visibility of the API member. */
const parseApi = biExecutor(
  ({tag}) => tag.type === 'api',
  ({tag}) => createParsedAPIContainer('api', tag.visibility)
);

/** Parses an edit line number for the API member. */
const parseEditLine = biExecutor(
  ({tag}) => tag.type === 'editline',
  ({tag}) => createParsedAPIContainer('editLine', tag.editline)
);

/** Parses an alias of the API member. */
const parseAlias = biExecutor(
  ({tag}) => tag.type === 'alias',
  ({tag}) => createParsedAPIContainer('aliases', [tag.string])
);

/** Parses an api name of the member. */
const parseDisplay = biExecutor(
  ({tag}) => tag.type === 'display',
  ({tag}) => createParsedAPIContainer('apiName', tag.string)
);

/** Parses syntax versions of the member? */
const parseSyntax = biExecutor(
  ({tag}) => tag.type === 'syntax',
  ({tag}) => createParsedAPIContainer('syntax', [tag.string])
);

/** Parses links to other members or external resources. */
const parseSee = biExecutor(
  ({tag}) => tag.type === 'see',
  ({tag}) => createParsedAPIContainer('see', [tag.string])
);

/**Parses a returns member.*/
const parseReturns = biExecutor(
  ({tag}) => tag.type === 'returns' || tag.type === 'return',
  ({tag}) => createParsedAPIContainer(
    'returns',
    {type: normalizeTypes(tag.types), description: tag.description || ''}
  )
);

/** Parses an initial version when a member is appeared. */
const parseSince = biExecutor(
  ({tag}) => tag.type === 'since',
  ({tag}) => createParsedAPIContainer('since', tag.string)
);

/** Parses a visibility trait of the member.*/
const parseInternal = biExecutor(
  ({tag}) => tag.type === 'internal',
  () => createParsedAPIContainer('internal', true)
);

/** Parses an example of member usage. */
const parseExample = biExecutor(
  ({tag}) => tag.type === 'example',
  ({tag}) => createParsedAPIContainer('example', tag.string)
);

/** Parses an W3C version? */
const parseW3C = biExecutor(
  ({tag}) => tag.type === 'w3c',
  ({tag}) => createParsedAPIContainer('w3c', tag.string)
);

/** Parses a link to the detailed member description. */
const parseMoreInfo = biExecutor(
  ({tag}) => tag.type === 'moreinfo',
  ({tag}) => createParsedAPIContainer('moreInfo', tag.string)
);

/** Parses what? */
const parseJSONWire = biExecutor(
  ({tag}) => tag.type === 'jsonwire',
  ({tag}) => createParsedAPIContainer('jsonWire', tag.string)
);

/** Parses an order index of member appearance. */
const parseSortIndex = biExecutor(
  ({tag}) => tag.type === 'sortindex',
  ({tag}) => createParsedAPIContainer('sortIndex', Number(tag.string))
);

/**
 * Merges parsed API containers to single parsed comment.
 *
 * @param {ParsedAPIComment} result
 * @param {ParsedAPIContainer<unknown>} container
 * @returns {ParsedAPIComment}
 */
const mergeParsedTags = (result, {type, value}) => {
  Array.isArray(value) ? result[type].push(...value) : result[type] = value;

  return result;
};

/**
 * @param {ParsedAPIComment} accumulate
 * @param {unknown} value
 * @returns {(...[*]) => ParsedAPIComment}
 */
const parseAndMergeTags = (accumulate, value) =>
  (...parsers) => parsers
    .map(parser => parser(value) && mergeParsedTags(accumulate, parser(value)))
    .filter(parserResult => parserResult)[0];

/** @returns {ParsedAPIComment} */
const createEmptyParsedAPIComment = () => ({
  name: '',
  link: '',
  parameters: [],
  api: '',
  editLine: '',
  aliases: [],
  apiName: null,
  syntax: [],
  see: [],
  returns: null,
  since: null,
  internal: false,
  example: '',
  w3c: '',
  jsonWire: '',
  moreInfo: null,
  sortIndex: 0
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
        comment.tags.reduce((accumulate, value) =>
          parseAndMergeTags(accumulate, {tag: value, comment, filePath: path})(
            parseName,
            parseLink,
            parseParameter,
            parseApi,
            parseEditLine,
            parseAlias,
            parseDisplay,
            parseSyntax,
            parseSee,
            parseReturns,
            parseSince,
            parseInternal,
            parseExample,
            parseW3C,
            parseMoreInfo,
            parseJSONWire,
            parseSortIndex
          ), createEmptyParsedAPIComment())
      );

/**
 * Parse and structure API files.
 *
 * @param {readonly APIFile[]} files
 * @returns {readonly StructuredAPIFile[]}
 */
const parseApiFiles = (files) =>
  files
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
