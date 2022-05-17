const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {timestamp} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {info, LineBuilder, MessageBuilder} = require('../../logger/index.js');

/** @param {number} startTime */
const successMessage = (startTime) =>
  MessageBuilder()
    .line(
      LineBuilder()
        .text(Typography.green(Symbols.Check))
        .phrase('The project is built successfully.')
        .build()
    )
    .line(
      LineBuilder()
        .text('Date:')
        .phrase(Typography.bold(timestamp()))
        .text(' - ')
        .text('Time:')
        .phrase(
          `~${Typography.bold(Math.round(performance.now() - startTime))}ms`
        )
        .transform(Typography.gray)
        .build()
    );

exports.build = () =>
  new Command('build')
    .description('Builds the project, copies assets into an output directory')
    .action(() => {
      const startTime = performance.now();

      successMessage(startTime).pipe(info);
    });
