/**
 * @file Contains asset manager for easy managing internal assets.
 *
 * @module assets
 */

const path = require('path');
const process = require('process');

const {Configuration} = require('../configuration/index.js');

const workingDirectory = process.cwd();
const filesDirectory = path.resolve(__dirname, 'files');

/**
 * An asset description.
 *
 * @typedef {Object} Asset
 * @property {string} Asset.source - A source path to the asset. It is
 *   known beforehand, that's why it shouldn't be changed by {@link AssetTransformer}.
 *   Contains parts of the absolute source path.
 * @property {string[]} Asset.destination - An output path fragments to the asset.
 *   Path fragments are relative to the current working directory.
 *   A first fragment is always a configured directory for a known asset kind.
 *   A last fragment is a default name of the asset kind.
 *   Refer to {@link AssetKind} for asset names.
 */

/**
 * Describes an object which will be used to build
 * a final {@link Asset}.
 *
 * @typedef {Object} AssetDraft
 * @property {string[]} source
 * @property {string[]} destination
 */

/**
 * Transforms an asset draft.
 *
 * @callback AssetTransformer
 * @param {AssetDraft} assetDraft
 * @returns {AssetDraft}

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
 * Builds the {@link Asset}.
 *
 * At first, the {@link AssetDraft} instance is created.
 * All methods operate over that type.
 *
 * The {@link Asset} instance is build by the `build` method
 * automatically.
 *
 * @param {AssetKind} kind
 */
const AssetBuilder = (kind) => {
  /** @type {(AssetTransformer)[]} */
  const transformers = [];

  /** @type {AssetDraft} */
  const asset = {
    source: [filesDirectory, kind],
    destination: []
  };

  switch (kind) {
    case AssetKind.Layout:
      asset.destination.push(Configuration.directories.layouts, kind);
      break;
    case AssetKind.Section:
      asset.destination.push(Configuration.directories.contents, kind);
      break;
    case AssetKind.PageTest:
      asset.destination.push(Configuration.directories.tests, kind);
      break;
    default:
      // We can omit displaying pretty output here, because
      // that situation should never happen. It is not like
      // a user will control what kind of asset is passed to
      // the builder, so this error is caughtable and prevented.
      throw new Error(`An unknown asset kind passed: ${kind}.`);
  }

  const API = {
    /**
     * Defines an {@link AssetDraft} transformer.
     * Many transformers are allowed for the one file.
     * In that case it will be processed in the
     * order in which transformers were declared.
     *
     * @example
     *   AssetBuilder()
     *     .map((assetDraft) => { /* ... *\/ })
     *     .map((assetDraft) => { /* ... *\/ })
     *
     * @param {AssetTransformer} fn
     */
    map: (fn) => (transformers.push(fn), API),
    /**
     * Builds a final {@link Asset}.
     *
     * @returns {Asset}
     */
    build: () => {
      // This will always be the last transformer, so we are safe
      // to add AssetDraft -> Asset transformer.
      transformers.push(({source, destination}) => ({
        source: path.resolve(...source),
        destination: path.resolve(workingDirectory, ...destination)
      }));

      return transformers.reduce((asset, transform) => transform(asset), asset);
    }
  };

  return API;
};

exports.AssetKind = AssetKind;
exports.AssetBuilder = AssetBuilder;