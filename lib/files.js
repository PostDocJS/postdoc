/**
 * @file Contains entities for declarative working with files.
 *
 * @module files
 */

const {sep, dirname, join} = require('path');
const {promises: fs, existsSync, readdirSync} = require('fs');

const {watch} = require('chokidar');

const {panic, pipe} = require('./utils/fp.js');

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
 * If file is virtual, it assumes the content is empty.
 *
 * @param {SourceGetter} source - A _source_ path of the _File_.
 * @param {ContentTransformer[]} transformers - An array of content transformers.
 */
const createContentReader = (source, transformers) => async () => {
  const data = existsSync(source())
    ? await fs.readFile(source(), {encoding: 'utf8'})
    : '';

  return pipe(...transformers)(data);
};

/**
 * Creates a lazy file entity.
 * It can represent either real file or the virtual one.
 *
 * @param {string} [source]
 */
const File = (source = null) => {
  /** @type {ContentTransformer[]} */
  const transformers = [];

  const content = createContentReader(() => source, transformers);

  const API = {
    /**
     * Transforms a file content.
     * Multiple transformers are allowed for one file.
     * They will be executed in order of declaration.
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
    /** Checks whether a file exists at the _source_ location. */
    exists: () => existsSync(source),
    /** Returns a _source_ path of the _File_. */
    source: () => source,
    /**
     * Reads the file at the _source_ location and
     * executes transformers.
     *
     * @returns a transformed content of the file.
     */
    content,
    /**
     * Reads the file from the _source_ location,
     * transforms if there are some {@link ContentTransformer}s registered
     * and writes the file back to the file system. You can provide
     * the {@link File} entity to describe the destination, otherwise
     * new content will rewrite the current one.
     *
     * It creates the non-existent directories.
     *
     * @param {string} [to]
     */
    write: async (to) => {
      const data = await content();

      const destination = to || source;

      await fs.mkdir(dirname(destination), {recursive: true});
      
      await fs.writeFile(destination, data, {encoding: 'utf8'});

      return to ? File(to) : API;
    },
    /** Sets up a watcher under the `File`'s source path. */
    watch: () => watch(source, {ignoreInitial: true}),
    /** Removes the file at the *source* location. */
    remove: () => fs.rm(source)
  };

  return API;
};

/**
 * Object that is returned by the {@link File} creator.
 *
 * @typedef {ReturnType<typeof File>} IFile
 */

/**
 * Creates a lazy directory entity.
 * It is created as a group of files which is the directory
 * compound of.
 *
 * @param {string} [source]
 */
const Directory = (source = null) => {
  let recursive = false;

  const API = {
    /** Returns a _source_ path of the _Directory_. */
    source: () => source,
    /**
     * Defines whether inner directories should be count.
     * By default, only the direct files are processed.
     *
     * @param {boolean} value
     */
    recursive: (value) => ((recursive = value), API),
    /** Checks whether a directory exists at _source_ location. */
    exists: () => fs.opendir(source).then(() => true, () => false),
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
              ? File(join(source, dirent.name))
              : /* eslint-disable -- it requires to align methods with the entity. */
                Directory(join(source, dirent.name))
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
    watch: () => {
      if (!source) {
        panic('The directory should have a defined "source" path to watch it.');
      }

      return watch(
        source + (recursive ? sep + '**' + sep + '*' : ''),
        {
          ignoreInitial: true
        }
      );
    },
    /**
     * Moves the directory and the content from the *source*
     * to the *destination* path. After that the *source* path
     * points to the *destination* path.
     *
     * @param {string} to
     */
    moveTo: async (to) => {
      await fs.rename(source, to);

      source = to;

      return API;
    },
    /** Recursively creates the directory at the *source* path. */
    create: () => fs.mkdir(source, {recursive: true}).then(() => API),
    /** Removes the directory at the *source* path. */
    remove: () => fs.rm(source, {recursive: true})
  };

  return API;
};

/**
 * Object that is returned by the {@link Directory} creator.
 *
 * @typedef {ReturnType<typeof Directory>} IDirectory
 */

exports.File = File;
exports.Directory = Directory;
