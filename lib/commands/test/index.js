const {Command} = require('commander');

const {info, MessageBuilder, LineBuilder} = require('../../logger/index.js');

const successMessage = MessageBuilder().line(
  LineBuilder().text('--- Test results should be here. ---').build()
);

/** Creates a `test` subcommand for the `create` command. */
exports.test = () =>
  new Command('test')
    .description('Runs all test declared in the project')
    .action(() => successMessage.pipe(info));
