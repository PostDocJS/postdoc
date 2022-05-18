const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {
  info,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/** @param {Date} duration */
const successMessage = (duration) =>
  MessageBuilder()
    .line(
      LineBuilder()
        .text(Typography.green(Symbols.Check))
        .phrase('The project is built successfully.')
        .build()
    )
    .line(StatusLine(duration).build());

exports.build = () =>
  new Command('build')
    .description('Builds the project, copies assets into an output directory.')
    .action(() => {
      const duration = Duration();

      successMessage(duration.toDate()).pipe(info);
    });
