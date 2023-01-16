/**
 * @file Contains the definition of the `run` command.
 */

const {Command} = require('commander');

const {serveProject} = require('../../bundler/index.js');

/** Crates a `run` command for the PostDoc CLI. */
exports.run = () =>
  new Command('run')
    .description('Starts development server with HMR and live preview.')
    .action(serveProject);
