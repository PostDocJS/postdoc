const {argv} = require('process');
const {spawn} = require('child_process');

const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Container} = require('../../utils/container.js');
const {Directory} = require('../../files.js');
const {Typography} = require('../../logger/colors.js');
const {CONFIGURATION_ID} = require('../../configuration/index.js');
const {
  warn,
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/**
 * Creates a `test` subcommand. Runs {@link nightwatch} binary
 * in a subprocess, so this command can accept all options as the
 * `nightwatch` itself.
 */
exports.test = () =>
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
