/**
 * @file Contains the definition of the `build` command.
 */

const {performance} = require('perf_hooks');

const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {identity} = require('../../utils/fp.js');
const {Duration} = require('../../utils/date.js');
const {buildOnce} = require('../../bundler/index.js');
const {Typography} = require('../../logger/colors.js');
const {
  info,
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

      const results = await buildOnce();

      MessageBuilder()
        .lineIf(
          () => results.every(identity),
          () =>
            LineBuilder()
              .text(Typography.green(Symbols.Check))
              .phrase('The project is built successfully.')
              .build()
        )
        .line(StatusLine(duration.until(performance.now()).toDate()).build())
        .pipe(info);
    });
