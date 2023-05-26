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
    .option('-o | --open [name]', 'Automatically open the app in the browser on server start.', false)
    .option('-u | --url [url]', 'URL to open after the server is started.')
    .description('Starts development server with HMR and live preview.')
    .action(async ({open, url}) => {
      defineMode(Mode.Development);

      await serveProject({startUrl: url, autoOpenBrowser: open});
    });
