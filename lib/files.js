/**
 * @file Contains entities for declatarive working with files.
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

/**
 * Describes kinds of the {@link FileCommand} instances.
 *
 * @enum {string}
 * @readonly
 */
const FileCommandKind = {
  /**
   * That kind of command accomplish copying a file
   * from a _source_ path to a _destination_ path.
   * Or it can perform writing a new file to
   * a desired _destination_.
   * It checks for the file existence and refuses
   * to execute when the file exists following the
   * _destination_ path.
   * If the _destination_ path includes non-existent
   * directories the command will create them.
   */
  Transport: 'transport_kind',
  /**
   * Checks for a file existence following a _source_ path.
   * No other operations are intended.
   */
  CheckSource: 'check_source_kind',
  /**
   * Checks for a file existence following a _destination_ path.
   * No other operations are intended.
   */
  CheckDestination: 'check_destination_kind'
};

/**
 * Describes all event types that {@link FileCommand} may produce.
 *
 * @enum {string}
 * @readonly
 */
const FileCommandEventType = {
  Fail: 'fail_event_type',
  Success: 'success_event_type'
};

/**
 * Builds a {@link FileCommand}.
 * By default, {@link FileCommandKind.Transport} command kind
 * is created.
 */
const FileCommandBuilder = () => {
  const id = uid();

  /** @type {FileTransformer[]} */
  const transformers = [];
  /** @type {Map<FileCommandEventType, VoidFunction[]>} */
  const listeners = new Map([
    [FileCommandEventType.Fail, []],
    [FileCommandEventType.Success, []]
  ]);

  /** @type {FileCommandKind} */
  let kind = FileCommandKind.Transport;
  /** @type {string|null} */
  let source = null;
  /** @type {string|null} */
  let destination = null;

  const API = {
    /**
     * Attaches a listener to a {@link FileCommandEventType}.
     *
     * @param {FileCommandEventType} type
     * @param {VoidFunction} callback
     */
    on: (type, callback) => (listeners.get(type).push(callback), API),
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
     * Change the kind of this command.
     *
     * @param {FileCommandKind} value
     */
    kind: (value) => ((kind = value), API),
    /**
     * Prepares a {@link FileCommand} instance.
     *
     * @returns {FileCommand}
     */
    build: () => {
      let command = async () => {
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
      };

      switch (kind) {
        case FileCommandKind.CheckSource:
          command = async () => {
            if (source === null) {
              MessageBuilder()
                .line(
                  LineBuilder()
                    .text('Cannot check for the file existence.')
                    .phrase('The source path is not defined.')
                    .map(Typography.red)
                    .build()
                )
                .pipe(error);

              return false;
            }

            return existsSync(source);
          };
          break;
        case FileCommandKind.CheckDestination:
          command = async () => {
            if (destination === null) {
              MessageBuilder()
                .line(
                  LineBuilder()
                    .text('Cannot check for the file existence.')
                    .phrase('The destination path is not defined.')
                    .map(Typography.red)
                    .build()
                )
                .pipe(error);

              return false;
            }

            return existsSync(destination);
          };
          break;
        case FileCommandKind.Transport:
          // Nothing is needed here because the command variable
          // has already according command definition.
          break;
        default:
          // We can throw error here because there shouldn't be a
          // case when we pass an unknown kind value.
          throw new Error(`An unknown command kind passed: ${kind}`);
      }

      return Object.assign(
        async () => {
          const result = await command();

          listeners
            .get(FileCommandEventType[result ? 'Success' : 'Fail'])
            .forEach((fn) => fn());

          return result;
        },
        {id}
      );
    },
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
     * Registers an independent {@link FileCommand}.
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
    /**
     * Registers dependent {@link FileCommand}s.
     * Commands will be executed sequentially.
     * Every previous command is the guard for the
     * next one. If some of the commands fails, then
     * all commands after it won't be executed at all.
     * In case of the fail, all previous commands won't
     * revert their tasks.
     *
     * @param {...FileCommand} commands
     */
    guarded: (...commands) => {
      fileCommands.push(() =>
        commands.reduce(
          (result, command) =>
            result.then((value) => (value ? command() : value)),
          Promise.resolve(true)
        )
      );

      return API;
    },
    /** Executes all {@link FileCommand}s in parallel. */
    execute: () => Promise.all(fileCommands.map((start) => start()))
  };

  return API;
};

exports.FilesManager = FilesManager;
exports.FileCommandKind = FileCommandKind;
exports.FileCommandBuilder = FileCommandBuilder;
exports.FileCommandEventType = FileCommandEventType;
