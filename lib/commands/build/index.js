/**
 * @file Contains the definition of the `build` command.
 */

import {inspect} from 'node:util';

import {Command} from 'commander';

import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Typography} from '../../logger/colors.js';
import {buildProject} from '../../bundler/index.js';
import {defineMode, Mode} from '../../mode.js';
import {
  info,
  error,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

/** Creates a `build` command. */
export const build = () =>
  new Command('build')
    .description('Builds the project, copies assets into an output directory.')
    .action(async () => {
      const duration = Duration();

      defineMode(Mode.Build);

      try {
        await buildProject();

        MessageBuilder()
          .line(
            LineBuilder()
              .text(Typography().green(Symbols.Check))
              .phrase('The project is built successfully.')
              .build()
          )
          .line(StatusLine(duration.untilNow().toDate()).build())
          .pipe(info);
      } catch (err) {
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
              .phrase(inspect(err))
              .build()
          )
          .line(StatusLine(duration.untilNow().toDate()).build())
          .pipe(error);
      }
    });
