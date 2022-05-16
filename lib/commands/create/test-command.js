const {Command} = require('commander');

const {info, emphasize} = require('../../utils/logger.js');

/** Creates a `test` subcommand for the `create` command. */
exports.test = () =>
  new Command('test')
    .argument(
      '<name>',
      'A name of the page for which a test suite should be generated'
    )
    .description('Generates a default test suite for the <name> page')
    .action(
      (name) => info`A test suite for the ${emphasize(name)} page is created.`
    );
