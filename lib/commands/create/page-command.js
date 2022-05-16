const {Command} = require('commander');

const {info} = require('../../utils/logger.js');

/** Creates a `page` subcommand for the `create` command. */
exports.page = () =>
  new Command('page')
    .argument(
      '<name>',
      'Name of a new page. It will be served as a URL path also'
    )
    .option('--test', 'Generates a test for the <name> page', false)
    .description('Creates a new page that will be available with /<name> URL')
    .action(
      (name, {test}) =>
        info`The ${name} page ${test ? 'and a test suite are' : 'is'} created.`
    );
