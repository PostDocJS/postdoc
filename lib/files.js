/**
 * @file Contains entities for declatarive working with
 * the file system.
 *
 * @module files
 */

const fs = require('fs/promises');
const path = require('path');
const {existsSync} = require('fs');

const {uid} = require('./utils/crypto.js');
const {Typography} = require('./logger/colors.js');
const {
  warn,
  error,
  Separator,
  LineBuilder,
  MessageBuilder
} = require('./logger/index.js');

/**
 * Log pattern for a skipped command.
 *
 * @param {string} id
 */
const skipCommandPattern = (id) =>
  LineBuilder()
    .padStart(2, Separator.Space)
    .text('Skipping the')
    .phrase(Typography.bold(id))
    .phrase('command...')
    .map(Typography.dim)
    .build();

/**
 * Describes a task for handling a work
 * over a file. Contains a unique identifier
 * of the command which is accessible via
 * `id` property.
 *
 * @callback FileCommand
 * @returns {Promise<boolean>} - the result of the command.
 *   Whether successful or not.
 */

/**
 * @callback FileTransformer
 * @param {string} content - of the file.
 * @returns {string} - changed content of the file.
 */

/** Builds a {@link FileCommand}. */
const FileCommandBuilder = () => {
  const id = uid();

  /** @type {FileTransformer[]} */
  const transformers = [];

  /** @type {string|null} */
  let source = null;
  /** @type {string|null} */
  let destination = null;

  const API = {
    /**
     * Defines a transformer of the file.
     * Many transformers are allowed for the one file.
     * In that case it will be processed in the
     * order in which transformers were declared.
     *
     * @example
     *   FileCommandBuilder()
     *     // Will be executed firstly.
     *     .map((content) => content.replace('a', 'b'))
     *     // Will be executed secondly.
     *     .map((content) => content + 'end.')
     *
     * @param {FileTransformer} fn
     */
    map: (fn) => (transformers.push(fn), API),
    /**
     * Prepares a {@link FileCommand} instance.
     *
     * @returns {FileCommand}
     */
    build: () =>
      Object.assign(
        async () => {
          if (destination === null) {
            MessageBuilder()
              .line(
                LineBuilder()
                  .text('The destination path for the file is not set.')
                  .map(Typography.red)
                  .build()
              )
              .line(skipCommandPattern(id))
              .pipe(error);

            return false;
          } else if (existsSync(destination)) {
            MessageBuilder()
              .line(
                LineBuilder()
                  .text('The file')
                  .phrase(Typography.bold(path.basename(destination)))
                  .phrase('exists.')
                  .map(Typography.yellow)
                  .build()
              )
              .line(skipCommandPattern(id))
              .pipe(warn);

            return false;
          }

          /**
           * A content of the file.
           * It can be empty in case of a wrong source path only.
           *
           * @type {string|null}
           */
          const content =
            source === null
              ? ''
              : await fs.readFile(source, {encoding: 'utf8'}).catch(() => null);

          if (content === null) {
            MessageBuilder()
              .line(
                LineBuilder()
                  .text('The file')
                  .phrase(Typography.bold(source))
                  .phrase('does not exist or cannot be read.')
                  .build()
              )
              .line(skipCommandPattern(id))
              .pipe(error);

            return false;
          }

          // The destination path may be deep and we have to be sure
          // that all directories exist. Otherwise, we shall create them.
          await fs.mkdir(path.dirname(destination), {recursive: true});

          await fs.writeFile(
            destination,
            transformers.reduce(
              (content, transform) => transform(content),
              content
            ),
            {encoding: 'utf8'}
          );

          return true;
        },
        {id}
      ),
    /**
     * Defines a source path to the file.
     * The source path can be omitted in that case
     * the content implies an empty string which
     * can be modified and filled with the {@link FileTransformer}s.
     *
     * @param {string} path - absolute path to the file.
     */
    source: (path) => ((source = path), API),
    /**
     * Defines a destination path for the file.
     *
     * @param {string} path
     */
    destination: (path) => ((destination = path), API)
  };

  return API;
};

/**
 * @callback CommandIfPredicate
 * @returns {boolean}
 */

/**
 * @callback FileCommandGetter
 * @returns {AssetCommand}
 */

/** Collects and executes {@link FileCommand}s. */
const FilesManager = () => {
  /** @type {FileCommand[]} */
  const fileCommands = [];

  const API = {
    /**
     * Registers a {@link FileCommand}.
     *
     * @param {FileCommand} command
     */
    command: (command) => (fileCommands.push(command), API),
    /**
     * Contidionally consumes a command.
     * If _predicate_ returns `false`, then the command will be
     * skipped.
     *
     * @param {CommandIfPredicate} predicate
     * @param {FileCommandGetter} getCommand
     */
    commandIf: (predicate, getCommand) => {
      if (predicate()) {
        fileCommands.push(getCommand());
      }

      return API;
    },
    /** Executes all {@link FileCommand}s in parallel. */
    execute: () => Promise.all(fileCommands.map((start) => start()))
  };

  return API;
};

exports.FilesManager = FilesManager;
exports.FileCommandBuilder = FileCommandBuilder;
