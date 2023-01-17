/**
 * @file Contains asset manager for easy managing internal assets.
 *
 * @module assets
 */

import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {Container} from '../utils/container.js';
import {CONFIGURATION_ID} from '../configuration/index.js';

const filesDirectory = join(dirname(fileURLToPath(import.meta.url)), 'files');

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
export const AssetKind = {
  Page: 'page.md',
  Layout: 'layout.ejs',
  Include: 'include.ejs',
  PageTest: 'page-test.js',
  PackageDefinition: 'package.json'
};

/**
 * Builds the {@link Asset}.
 *
 * At first, the {@link AssetDraft} instance is created.
 * All methods operate over that type.
 *
 * The {@link Asset} instance is built by the `build` method
 * automatically.
 *
 * @param {AssetKind} kind
 */
export const AssetBuilder = (kind) => {
  const configuration = Container.get(CONFIGURATION_ID);

  /** @type {(AssetTransformer)[]} */
  const transformers = [];

  /** @type {AssetDraft} */
  const asset = {
    source: [filesDirectory, kind],
    destination: []
  };

  // Filling initial path parts of the asset destination.
  // We don't have to worry about precise path here, because
  // the final structure has to be defined with the *AssetTransformer*
  // functions.
  switch (kind) {
    case AssetKind.Page:
      asset.destination.push(configuration.directories.contents || configuration.directories.pages, kind);
      break;
    case AssetKind.Layout:
      asset.destination.push(configuration.directories.pages, kind);
      break;
    case AssetKind.Include:
      asset.destination.push(configuration.directories.includes, kind);
      break;
    case AssetKind.PageTest:
      asset.destination.push(configuration.directories.tests, kind);
      break;
    case AssetKind.PackageDefinition:
      asset.destination.push('.', kind);
      break;
    default:
      // We can omit displaying pretty output here, because
      // that situation should never happen. It is not like
      // a user will control what kind of asset is passed to
      // the builder, so this error is catchable and prevented.
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
        source: join(...source),
        destination: join(...destination)
      }));

      return transformers.reduce((asset, transform) => transform(asset), asset);
    }
  };

  return API;
};
