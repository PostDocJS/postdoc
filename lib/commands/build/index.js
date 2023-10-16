import {inspect} from 'node:util';

import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Typography} from '../../logger/colors.js';
import {buildProject} from '../../bundler/index.js';
import {CustomCommand} from '../../utils/custom-command.js';
import {defineMode, Mode} from '../../mode.js';
import {
  info,
  error,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

/**
 * Builds a project for production.
 *
 * @since 0.1.0
 */
export const build = () =>
  new CustomCommand('build')
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
            LineBuilder().text(Separator.Space).phrase(inspect(err)).build()
          )
          .line(StatusLine(duration.untilNow().toDate()).build())
          .pipe(error);
      }
    });
