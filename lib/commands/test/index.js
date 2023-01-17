import {argv} from 'node:process';
import {spawn} from 'node:child_process';

import {Command} from 'commander';

import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Container} from '../../utils/container.js';
import {Directory} from '../../files.js';
import {Typography} from '../../logger/colors.js';
import {CONFIGURATION_ID} from '../../configuration/index.js';
import {
  warn,
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

/**
 * Creates a `test` subcommand. Runs {@link nightwatch} binary
 * in a subprocess, so this command can accept all options as the
 * `nightwatch` itself.
 */
export const test = () =>
  new Command('test')
    .description('Runs all test declared in the project.')
    .action(async () => {
      const duration = Duration();

      const {directories} = Container.get(CONFIGURATION_ID);

      const doesTestsDirectoryExist = await Directory(directories.tests).exists();

      if (!doesTestsDirectoryExist) {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Typography().red(Symbols.Cross))
              .phrase('The project doesn\'t have a test ("')
              .text(Typography().bold(directories.tests))
              .text('") directory.')
              .build()
          )
          .line(
            LineBuilder()
              .text('Please, create at least one test suite for some page')
              .build()
          )
          .line(Separator.Empty)
          .line(
            LineBuilder()
              .padStart(4, Separator.Space)
              .text('postdoc create test <page-name>')
              .map(Typography().gray)
              .build()
          )
          .line(Separator.Empty)
          .line(LineBuilder().text('and repeat again.').build())
          .line(StatusLine(duration.untilNow().toDate()).build())
          .pipe(warn);

        return;
      }

      spawn('npx', ['nightwatch', ...argv], {
        stdio: 'inherit'
      })
        .on('close', () => 
          MessageBuilder()
            .line(StatusLine(duration.untilNow().toDate()).build())
            .pipe(info)
        );
    });
