const {Command} = require('commander');

const {info, emphasize} = require('../../logger');

/** Crates a `run` command for the PostDoc CLI. */
exports.run = () =>
  new Command('run')
    .description('Starts development server with HMR and live preview')
    .action(
      () =>
        info`The develompent server is running on ${emphasize(
          'localhost:3434'
        )}`
    );
