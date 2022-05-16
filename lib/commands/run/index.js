const {Command} = require('commander');

const {info} = require('../../utils/logger.js');

/** Crates a `run` command for the PostDoc CLI. */
exports.run = () =>
  new Command('run')
    .description('Starts development server with HMR and live preview')
    .action(
      () => info`The develompent server is running on localhost:3434`
    );
