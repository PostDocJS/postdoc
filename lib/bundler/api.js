/**
 * @file is responsible for finding, parsing and structuring data
 *  for API pages.
 *
 * @module api
 */

const path = require('path');

const {Option} = require('../utils/option.js');
const {Directory} = require('../files.js');
const {Container} = require('../utils/container.js');
const {Typography} = require('../logger/colors.js');
const {CONFIGURATION_ID} = require('../configuration/index.js');
const {mergeFutures, Succeed} = require('../utils/future.js');
const {MessageBuilder, LineBuilder, error: logError} = require('../logger/index.js');
const {toArray, bimap, compose, filter, map, concat, parallelMap, memo} = require('../utils/fp.js');

/**
 * Reads all files that may contain comments for the API extractor tool.
 *
 * @param {Array<string>} bases
 * @returns {readonly import('../files.js').IFile[]}
 */
const collectApiFiles = (bases) =>
  bases
    .flatMap(
      (directoryPath) => Directory()
        .recursive(true)
        .setSource(path.resolve(directoryPath))
        .files()
        .filter((file) => !file.source().includes(`${path.sep}_`))
    );

/**
 * Object that describes every parsed document comment.
 *
 * @typedef {Object} APIComment
 * @property {readonly APICommentTag[]} tags
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
 * @property {string} linkDisplay
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
 * @returns {IFuture<APIFile, Error>}
 */
const extractAPI = (file) => {
  const parseComments = getAPIExtractorTool();

  return file
    .content()
    .map(parseComments)
    .map((comments) => ({comments, path: file.source()}));
};

/**
 * @returns {() => readonly APIComment[]} a function that returns an extractor function
 *  based on the `apiExtractor` config value.
 */
const getAPIExtractorTool = () => {
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
      const {parseComments} = require('dox');

      return (code) => parseComments(code, options);
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
const parseName = bimap(
  () => true,
  ({comment, filePath}) => {
    const extension = path.extname(filePath);

    const methodTag = comment.tags.find((tag) => tag.type === 'method');

    const name = methodTag
      ? methodTag.string
      : extension === '.js'
        ? path.basename(filePath, extension)
        : Option(comment.ctx.name).extract(() => '');

    return createParsedAPIContainer('name', name);
  },
  () => createParsedAPIContainer('name', '')
);

/** Parses a link used in the doc member. */
const parseLinkDisplay = bimap(
  ({tag}) => tag.type === 'link',
  ({tag}) => createParsedAPIContainer('linkDisplay', tag.string),
  () => createParsedAPIContainer('linkDisplay', '')
);

/** Parses a link display used in the doc member. */
const parseLink = bimap(
  ({tag}) => tag.type === 'link',
  ({tag}) => createParsedAPIContainer('link', tag.string.replace(/\/+/g, '').replace(/:/g, '').toLowerCase()),
  () => createParsedAPIContainer('link', '')
);

/**
 * Checks whether parameter member is optional or not.
 *
 * @param {string} name
 * @returns {boolean}
 */
const isParamOptional = (name) => name.startsWith('[') && name.endsWith(']');

/** Parses a parameter of the function member. */
const parseParameter = bimap(
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
  },
  () => createParsedAPIContainer('parameters', [])
);

/** Parses a visibility of the API member. */
const parseApi = bimap(
  ({tag}) => tag.type === 'api',
  ({tag}) => createParsedAPIContainer('api', tag.visibility),
  () => createParsedAPIContainer('api', '')
);

/** Parses an edit line number for the API member. */
const parseEditLine = bimap(
  ({tag}) => tag.type === 'editline',
  ({tag}) => createParsedAPIContainer('editLine', tag.editline),
  () => createParsedAPIContainer('editLine', '')
);

/** Parses an alias of the API member. */
const parseAlias = bimap(
  ({tag}) => tag.type === 'alias',
  ({tag}) => createParsedAPIContainer('aliases', [tag.string]),
  () => createParsedAPIContainer('aliases', [])
);

/** Parses an api name of the member. */
const parseDisplay = bimap(
  ({tag}) => tag.type === 'display',
  ({tag}) => createParsedAPIContainer('apiName', tag.string),
  () => createParsedAPIContainer('apiName', null)
);

/** Parses syntax versions of the member? */
const parseSyntax = bimap(
  ({tag}) => tag.type === 'syntax',
  ({tag}) => createParsedAPIContainer('syntax', [tag.string]),
  () => createParsedAPIContainer('syntax', [])
);

/** Parses links to other members or external resources. */
const parseSee = bimap(
  ({tag}) => tag.type === 'see',
  ({tag}) => createParsedAPIContainer('see', [tag.string]),
  () => createParsedAPIContainer('see', [])
);

/**Parses a returns member.*/
const parseReturns = bimap(
  ({tag}) => tag.type === 'returns' || tag.type === 'return',
  ({tag}) => createParsedAPIContainer(
    'returns',
    {type: normalizeTypes(tag.types), description: tag.description || ''}
  ),
  () => createParsedAPIContainer('returns', null)
);

/** Parses an initial version when a member is appeared. */
const parseSince = bimap(
  ({tag}) => tag.type === 'since',
  ({tag}) => createParsedAPIContainer('since', tag.string),
  () => createParsedAPIContainer('since', null)
);

/** Parses a visibility trait of the member.*/
const parseInternal = bimap(
  ({tag}) => tag.type === 'internal',
  () => createParsedAPIContainer('internal', true),
  () => createParsedAPIContainer('internal', false)
);

/** Parses an example of member usage. */
const parseExample = bimap(
  ({tag}) => tag.type === 'example',
  ({tag}) => createParsedAPIContainer('example', tag.string),
  () => createParsedAPIContainer('example', '')
);

/** Parses an W3C version? */
const parseW3C = bimap(
  ({tag}) => tag.type === 'w3c',
  ({tag}) => createParsedAPIContainer('w3c', tag.string),
  () => createParsedAPIContainer('w3c', '')
);

/** Parses a link to the detailed member description. */
const parseMoreInfo = bimap(
  ({tag}) => tag.type === 'moreinfo',
  ({tag}) => createParsedAPIContainer('moreInfo', tag.string),
  () => createParsedAPIContainer('moreInfo', null)
);

/** Parses what? */
const parseJSONWire = bimap(
  ({tag}) => tag.type === 'jsonwire',
  ({tag}) => createParsedAPIContainer('jsonWire', tag.string),
  () => createParsedAPIContainer('jsonWire', '')
);

/** Parses an order index of member appearance. */
const parseSortIndex = bimap(
  ({tag}) => tag.type === 'sortindex',
  ({tag}) => createParsedAPIContainer('sortIndex', Number(tag.string)),
  () => createParsedAPIContainer('sortIndex', 0)
);

/**
 * Merges parsed API containers to single parsed comment.
 *
 * @param {ParsedAPIComment} result
 * @param {ParsedAPIContainer<unknown>} container
 * @returns {ParsedAPIComment}
 */
const mergeParsedTags = (result, {type, value}) => {
  Array.isArray(value) ? result[type].concat(value) : result[type] = value;

  return result;
};

/** @returns {ParsedAPIComment} */
const createEmptyParsedAPIComment = () => ({
  name: '',
  link: '',
  linkDisplay: '',
  parameters: [],
  api: '',
  editLine: '',
  aliases: [],
  apiName: null,
  syntax: '',
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
 * @returns {Transducer<Array<ParsedAPIComment>, APIComment>}
 */
const createCommentParser = (path) => compose(
  filter(({ignore}) => !ignore),
  map((comment) => comment.tags.reduce(
    compose(
      map((tag) => ({tag, comment, filePath: path})),
      parallelMap(
        parseName,
        parseLink,
        parseLinkDisplay,
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
      )
    )(mergeParsedTags),
    createEmptyParsedAPIComment()
  ))
);

/**
 * Parse and structure API files.
 *
 * @param {IFuture<readonly APIFile[], Error>} result
 * @returns {IFuture<readonly StructuredAPIFile[], Error>}
 */
const parseApiFiles = (result) =>
  result.map((files) =>
    files.map(({comments, path}) =>
      ({file: path, entities: comments.reduce(createCommentParser(path)(concat), [])})
    )
  );

/**
 * Builds the API data based on the code's comments.
 *
 * @returns {Promise<readonly StructuredAPIFile[]>}
 */
const getAPIData = async () => {
  const {directories} = Container.get(CONFIGURATION_ID);

  const {extract} = await Option(directories.api)
    .map(toArray)
    .map(collectApiFiles)
    .map((files) => mergeFutures(files.map(extractAPI)))
    .map(parseApiFiles)
    .extract(() => Succeed([]))
    .run();

  return extract((error) => {
    MessageBuilder()
      .line(LineBuilder().text('Something went wrong:').map(Typography().red).build())
      .line(Typography().red(error.toString()))
      .pipe(logError);

    return [];
  });
};

// FIXME: Implementing --watch for the API is not so straightforward as for
// regular assets. It is unclear where API is used and where is not. So,
// small change in the external package will cause rebuild of the whole
// project. That is bad for big projects. Until that problem is solved, we
// will assume that API data is constant and doesn't change over time.
exports.getAPIData = memo(getAPIData);
