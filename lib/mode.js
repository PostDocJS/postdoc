import {env} from 'node:process';

/**
 * @enum {string}
 */
export const Mode = Object.freeze({
  Testing: 'testing',
  Creation: 'creation',
  Building: 'building',
  Development: 'development',
  Bootstrapping: 'bootstrapping'
});

/**
 * @param {Mode} mode
 */
export const defineMode = (mode) => { env.MODE = mode };
