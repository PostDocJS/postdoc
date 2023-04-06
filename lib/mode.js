import {env} from 'node:process';

/**
 * @enum {string}
 */
export const Mode = Object.freeze({
  Dev: 'dev',
  Init: 'init',
  Test: 'test',
  Build: 'build',
  Create: 'create'
});

/**
 * @param {Mode} mode
 */
export const defineMode = (mode) => { env.MODE = mode };
