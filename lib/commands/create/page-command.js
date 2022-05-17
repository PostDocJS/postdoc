const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Typography} = require('../../logger/colors.js');
const {info, LineBuilder} = require('../../logger/index.js');

/**
 * @param {string} name
 * @param {boolean} test
 */
const successMessage = (name, test) =>
  LineBuilder()
    .text(Typography.green(Symbols.Check))
    .phrase('The')
    .phrase(Typography.green(name))
    .phrase('page')
    .phrase(test ? 'and a test suite are' : 'is')
    .phrase('created.')
    .build();

/** Creates a `page` subcommand for the `create` command. */
exports.page = () =>
  new Command('page')
    .argument(
      '<name>',
      'Name of a new page. It will be served as a URL path also'
    )
    .option('--test', 'Generates a test for the <name> page', false)
    .description('Creates a new page that will be available with /<name> URL')
    .action((name, {test}) => info(successMessage(name, test)));
