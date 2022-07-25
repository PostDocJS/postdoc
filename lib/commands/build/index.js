/**
 * @file Contains the definition of the `build` command.
 */

const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {buildOnce} = require('../../bundler/index.js');
const {Typography} = require('../../logger/colors.js');
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

      const {isOk, isErr, extract} = await buildOnce();

      MessageBuilder()
        .lineIf(isOk, () =>
          LineBuilder()
            .text(Typography().green(Symbols.Check))
            .phrase('The project is built successfully.')
            .build()
        )
        .lineIf(isErr, () =>
          LineBuilder()
            .text(Typography().red(Symbols.Cross))
            .phrase('Not all pages are built successfully.')
            .build()
        )
        .lineIf(isErr, () =>
          LineBuilder()
            .text(Separator.Space)
            .phrase(extract((error) => error.message))
            .build()
        )
        .line(StatusLine(duration.untilNow().toDate()).build())
        .pipe(info);
    });
