/**
 * @file Contains the definition of the `run` command.
 */

const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {identity} = require('../../utils/fp.js');
const {Duration} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {Configuration} = require('../../configuration/index.js');
const {buildAll, watchForChanges} = require('../../bundler/index.js');
const {
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/** Crates a `run` command for the PostDoc CLI. */
exports.run = () =>
  new Command('run')
    .description('Starts development server with HMR and live preview.')
    .action(async () => {
      const duration = Duration();

      const results = await buildAll();

      watchForChanges();

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
        .line(Separator.Empty)
        .line(
          LineBuilder()
            .text('The development server is running on')
            .phrase(
              Typography.green(`localhost:${Configuration.devServer.port}`)
            )
            .text('...')
            .build()
        )
        .pipe(info);
    });
