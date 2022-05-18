/**
 * @file Contains functionality for managing assets.
 *   For example, copying, transforming and generating files.
 *
 * @module assets
 */

const fs = require('fs/promises');
const path = require('path');
const process = require('process');

const {Typography} = require('../logger/colors.js');
const {Configuration} = require('../configuration/index.js');
const {error, LineBuilder} = require('../logger/index.js');

const workingDirectory = process.cwd();
const filesDirectory = path.resolve(__dirname, 'files');

/**
 * Describes a task for handling an asset.
 * It may include any operation: copying, renaming,
 * transforming a content of the asset, etc.
 *
 * @callback AssetCommand
 * @returns {Promise<void>}
 */

/**
 * An asset description.
 *
 * @typedef {Object} Asset
 * @property {string[]} Asset.target - An output path fragments of the asset.
 *   Path fragments are relative to the current working directory.
 *   A first fragment is always configured directory for a known asset kind.
 *  A last fragment is a default name of the asset kind.
 *  Refer to {@link AssetKind} for asset names.
 * @property {string} Asset.content - A content of the asset.
 */

/**
 * @callback AssetTransformer
 * @param {Asset} asset
 * @returns {Asset} - a new asset data.
 */

/**
 * A map of predefined asset kinds.
 *
 * @enum {string}
 * @readonly
 */
const AssetKind = {
  Layout: 'layout.ejs',
  Section: 'section.md',
  PageTest: 'page-test.js'
};

/**
 * Creates an {@link AssetCommand} instance.
 *
 * @param {AssetKind} kind
 */
const AssetCommandBuilder = (kind) => {
  /** @type {AssetTransformer[]} */
  const transformers = [];

  const sourcePath = path.resolve(filesDirectory, kind);

  const API = {
    /**
     * Defines a transformer of the asset.
     * Many transformers are allowed for the one asset.
     * In that case the asset will be processed in the
     * order in which transformers were declared.
     *
     * @param {AssetTransformer} fn
     */
    map: (fn) => (transformers.push(fn), API),
    /**
     * Returns the {@link AssetCommand} instance.
     *
     * @returns {AssetCommand}
     */
    build: () => async () => {
      const rawContent = await fs.readFile(sourcePath, {encoding: 'utf8'});

      /** @type {string[]} */
      const destinationPath = [];

      switch (kind) {
        case AssetKind.Layout:
          destinationPath.push(Configuration.layouts, kind);
          break;
        case AssetKind.Section:
          destinationPath.push(Configuration.contents, '', kind);
          break;
        case AssetKind.PageTest:
          destinationPath.push(Configuration.tests, '', kind);
          break;
        default:
          return error(
            LineBuilder()
              .text(
                'Cannot execute an AssetCommand because an unknown asset kind received:'
              )
              .phrase(Typography.bold(kind))
              .build()
          );
      }

      const asset = transformers.reduce(
        (asset, transform) => transform(asset),
        {content: rawContent, target: destinationPath}
      );

      const outputPath = path.resolve(workingDirectory, ...asset.target);

      await fs.mkdir(path.dirname(outputPath), {recursive: true});

      await fs.writeFile(outputPath, asset.content, {encoding: 'utf8'});
    }
  };

  return API;
};

/**
 * @callback CommandIfPredicate
 * @returns {boolean}
 */

/**
 * @callback AssetCommandGetter
 * @returns {AssetCommand}
 */

/** Collects and executes {@link AssetCommand}s. */
const AssetsManager = () => {
  /** @type {AssetCommand[]} */
  const assetCommands = [];

  const API = {
    /**
     * @param {AssetCommand} command
     */
    command: (command) => (assetCommands.push(command), API),
    /**
     * Contidionally consume a command.
     * If _predicate_ returns `false`, then the command will be
     * skipped.
     *
     * @param {CommandIfPredicate} predicate
     * @param {AssetCommandGetter} getCommand
     */
    commandIf: (predicate, getCommand) => {
      if (predicate()) {
        assetCommands.push(getCommand());
      }

      return API;
    },
    /** Executes all {@link AssetCommand}s in parallel. */
    execute: () =>
      Promise.all(assetCommands.map((start) => start())).then(() => {})
  };

  return API;
};

exports.AssetKind = AssetKind;
exports.AssetsManager = AssetsManager;
exports.AssetCommandBuilder = AssetCommandBuilder;
