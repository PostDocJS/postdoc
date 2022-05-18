const {Command} = require('commander');

const {Symbols} = require('../../logger/Symbols.js');
const {Typography} = require('../../logger/colors.js');
const {info, LineBuilder, MessageBuilder} = require('../../logger/index.js');

/** @param {string} name */
const successMessage = (name) =>
  MessageBuilder()
    .line(
      LineBuilder()
        .text(Typography.green(Symbols.Check))
        .phrase('The project is generated.')
        .build()
    )
    .line('')
    .line(
      LineBuilder()
        .text('Navigate to it with:')
        .phrase(Typography.green('cd'))
        .phrase(Typography.green.bold(name))
        .build()
    )
    .line(
      LineBuilder()
        .text('Then to start development server run:')
        .phrase(Typography.green('postdoc run'))
        .build()
    );

exports.init = () =>
  new Command('init')
    .argument('<name>', 'A name of the project to generate.')
    .description(
      'Generates a default project structure and necessary files to start with.'
    )
    .action((name) => successMessage(name).pipe(info));
