/**
 * @file Contains entities for declarative working with files.
 *
 * @module files
 */

const path = require('path');
const {promises: fs, existsSync, readdirSync} = require('fs');

const {watch} = require('chokidar');

/**
 * @callback ContentTransformer
 * @param {string} content
 * @returns {string|Promise<string>}
 */

/**
 * @callback SourceGetter
 * @returns {string}
 */

/**
 * Creates a content reader for the _File_.
 *
 * @param {SourceGetter} source - A _source_ path of the _File_.
 * @param {ContentTransformer[]} transformers - An array of content transformers.
 */
const createContentReader = (source, transformers) => async () => {
  const raw = await fs.readFile(source(), {encoding: 'utf8'});

  return transformers.reduce(
    (content, transform) => content.then(transform),
    Promise.resolve(raw)
  );
};

/**
 * @typedef {Object} FileWriteOptions
 * @property {boolean} [ignore=true] - If the value is `true` then
 *   a file at the _destination_ path will be overwritten by the
 *   current file. Set the value to `false` to change this behaviour.
 */

/** Creates a lazy file entity. */
const File = () => {
  /** @type {ContentTransformer[]} */
  const transformers = [];

  /** @type {string|null} */
  let source = null;
  /** @type {string|null} */
  let destination = null;

  const content = createContentReader(() => source, transformers);

  const API = {
    /**
     * Transforms a file content.
     * Multiple transformers are allowed for one file.
     * They will be exected in order of declaration.
     * All transformers are lazy. That means they don't
     * execute immediately after declaration. The action
     * is delayed until the `write` method execution.
     *
     * @example
     *   File()
     *     .map((content) => content.padStart(5, 'a')) // 1
     *     .map((content) => content.trim()) // 2
     *     // other methods...
     *
     * @param {ContentTransformer} fn
     */
    map: (fn) => (transformers.push(fn), API),
    /** Checks whether a file exists at _source_ location. */
    exists: () => existsSync(source),
    /** Returns a _source_ path of the _File_. */
    source: () => source,
    /**
     * Defines a _source_ location for the file.
     * Only last passed value will be saved.
     *
     * @param {string} path
     */
    setSource: (path) => ((source = path), API),
    /** Returns a _source_ path of the _File_. */
    destination: () => destination,
    /**
     * Defines a _destination_ location for the file.
     * Only last passed value will be saved.
     *
     * @param {string} path
     */
    setDestination: (path) => ((destination = path), API),
    /**
     * Reads the file at the _source_ location and
     * executes transformers.
     *
     * @returns a transformed content of the file.
     */
    content,
    /**
     * Reads the file from the _source_ location,
     * transforms if there are {@link ContentTransformer}s registered
     * and writes the file to the _destination_ path.
     * The method creates directories if they don't exist.
     *
     * @param {FileWriteOptions} [options]
     */
    write: async ({ignore = true} = {}) => {
      if (existsSync(destination) && !ignore) {
        return false;
      }

      const data = await content();

      await fs.mkdir(path.dirname(destination), {recursive: true});

      await fs.writeFile(destination, data, {encoding: 'utf8'});

      return true;
    },
    /** Sets up a watcher under the `File`'s source path. */
    watch: () => watch(source, {ignoreInitial: true}),
    /** Removes the file at the *source* location. */
    remove: () => fs.unlink(source)
  };

  return API;
};

/**
 * Creates a lazy directory entity.
 * It is created as a group of files which is the directory
 * compound of.
 */
const Directory = () => {
  /** @type {string|null} */
  let source = null;
  let recursive = false;

  const API = {
    /** Returns a _source_ path of the _Directory_. */
    source: () => source,
    /**
     * Defines a _source_ path of the directory.
     * Only the last provided value will be saved.
     *
     * @param {string} path
     */
    setSource: (path) => ((source = path), API),
    /**
     * Defines whether inner directories should be count.
     * By default, only the direct files are processed.
     *
     * @param {boolean} value
     */
    recursive: (value) => ((recursive = value), API),
    /**
     * Creates the _File_ entities for each file the Directory
     * contains. If the _recursive_ option is `true` then files
     * from inner directories will be included in the result.
     *
     * @returns {ReturnType<typeof File>[]}
     */
    files: () =>
      readdirSync(source, {withFileTypes: true, encoding: 'utf8'})
        .filter((dirent) => recursive || dirent.isFile())
        .flatMap(
          (dirent) =>
            dirent.isFile()
              ? File().setSource(path.join(source, dirent.name))
              : /* eslint-disable -- it requires to align methods with the entity. */
                Directory()
                  .setSource(path.join(source, dirent.name))
                  .recursive(recursive)
                  .files() /* eslint-enable */
        ),
    /**
     * Sets up a watcher under files in the `Directory`.
     * The source path of the `Directory` has to be set before
     * invoking that method.
     *
     * If `recursive` is set to `true`, nested files and directories
     * are also watched.
     */
    watch: () =>
      watch(source + (recursive ? path.sep + '**' + path.sep + '*' : ''), {
        ignoreInitial: true
      }),
    /**
     * Moves the directory and the content from the *source*
     * to the *destionation* path. After that the *source* path
     * points to the *destination* path.
     *
     * @param {string} destination
     */
    move: async (destination) => {
      await fs.rename(source, destination);

      source = destination;

      return API;
    },
    /** Recursively creates the directory at the *source* path. */
    create: () => fs.mkdir(source, {recursive: true}).then(() => API),
    /**
     * Removes the directory at the *source* path.
     *
     * It uses the Node feature autodetection.
     * @todo Review that method after the project drops support of
     * the Node 12.
     */
    remove: () => (fs.rm || fs.rmdir)(source, {force: true, recursive: true})
  };

  return API;
};

exports.File = File;
exports.Directory = Directory;
