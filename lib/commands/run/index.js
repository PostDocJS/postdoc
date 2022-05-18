const {Command} = require('commander');

const {Typography} = require('../../logger/colors.js');
const {Configuration} = require('../../configuration/index.js');
const {info, LineBuilder, MessageBuilder} = require('../../logger/index.js');

const successMessage = MessageBuilder().line(
  LineBuilder()
    .text('The development server is running on')
    .phrase(Typography.green(`localhost:${Configuration.devServer.port}`))
    .text('...')
    .build()
);

/** Crates a `run` command for the PostDoc CLI. */
exports.run = () =>
  new Command('run')
    .description('Starts development server with HMR and live preview.')
    .action(() => successMessage.pipe(info));
