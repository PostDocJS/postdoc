const {Command} = require('commander');

const {info} = require('../../utils/logger.js');

/** Creates a `test` subcommand for the `create` command. */
exports.test = () =>
  new Command('test')
    .description('Runs all test declared in the project')
    .action(() => info`--- Test results should be here. ---`);
