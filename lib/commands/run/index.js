/**
 * @file Contains the definition of the `run` command.
 */

import {Command} from 'commander';

import {serveProject} from '../../bundler/index.js';

/** Crates a `run` command for the PostDoc CLI. */
export const run = () =>
  new Command('run')
    .description('Starts development server with HMR and live preview.')
    .action(serveProject);
