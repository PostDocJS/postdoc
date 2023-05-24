/**
 * @file Contains the definition of the `run` command.
 */

import {Command} from 'commander';

import {serveProject} from '../../bundler/index.js';
import {defineMode, Mode} from '../../mode.js';
import {CustomCommand} from '../../utils/custom-command.js';

/** Crates a `run` command for the PostDoc CLI. */
export const run = () =>
  new CustomCommand('run')
    .argument('[url]', 'URL to opend after the server is started')
    .option('-o | --open [name]', 'Automatically open the app in the browser on server start.', false)
    .description('Starts development server with HMR and live preview.')
    .action(async (url, {open}) => {
      defineMode(Mode.Development);

      await serveProject({startUrl: url, autoOpenBrowser: open});
    });
