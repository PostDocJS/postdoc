const {Command} = require('commander');

const {page} = require('./page-command.js');
const {test} = require('./test-command.js');

/** Creates a `create` command for the PostDoc CLI. */
exports.create = () =>
  new Command('create')
    .description(
      'Generates assets depending on the used subcommand. See "page", "test" and "component" subcommands.'
    )
    .addCommand(page())
    .addCommand(test());
