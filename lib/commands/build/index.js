/**
 * @file Contains the definition of the `build` command.
 */

const {inspect} = require('util');

const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {buildProject} = require('../../bundler/index.js');
const {
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/** Creates a `build` command. */
exports.build = () =>
  new Command('build')
    .description('Builds the project, copies assets into an output directory.')
    .action(async () => {
      const duration = Duration();

      await buildProject()
        .then(
          () =>
            MessageBuilder()
              .line(
                LineBuilder()
                  .text(Typography().green(Symbols.Check))
                  .phrase('The project is built successfully.')
                  .build()
              )
              .line(StatusLine(duration.untilNow().toDate()).build())
              .pipe(info),
          (error) =>
            MessageBuilder()
              .line(
                LineBuilder()
                  .text(Typography().red(Symbols.Cross))
                  .phrase('Not all pages are built successfully.')
                  .build()
              )
              .line(
                LineBuilder()
                  .text(Separator.Space)
                  .phrase(inspect(error))
                  .build()
              )
              .line(StatusLine(duration.untilNow().toDate()).build())
              .pipe(info)
        );
    });
