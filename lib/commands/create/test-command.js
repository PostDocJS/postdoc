const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Typography} = require('../../logger/colors.js');
const {info, LineBuilder} = require('../../logger/index.js');

/** @param {string} name */
const successMessage = (name) =>
  LineBuilder()
    .text(Typography.green(Symbols.Check))
    .phrase('A test suite for the')
    .phrase(Typography.green(name))
    .phrase('page is created.')
    .build();

/** Creates a `test` subcommand for the `create` command. */
exports.test = () =>
  new Command('test')
    .argument(
      '<name>',
      'A name of the page for which a test suite should be generated'
    )
    .description('Generates a default test suite for the <name> page')
    .action((name) => info(successMessage(name)));
