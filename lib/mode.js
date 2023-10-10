import {env} from 'node:process';

/**
 * @enum {string}
 */
export const Mode = Object.freeze({
  Dev: 'dev',
  Init: 'init',
  Test: 'test',
  Stage: 'stage',
  Build: 'build',
  Create: 'create',
  ApiDocsGeneration: 'apiDocGeneration'
});

/**
 * @param {Mode} mode
 */
export const defineMode = (mode) => {
  env.MODE = mode;
};
