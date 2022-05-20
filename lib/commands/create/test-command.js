/**
 * @file Contains a functionality of the `create test` subcommand.
 */

const path = require('path');

const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {Configuration} = require('../../configuration/index.js');
const {createLayoutFileName} = require('../../assets/helpers.js');
const {AssetKind, AssetBuilder} = require('../../assets/manager.js');
const {
  FilesManager,
  FileCommandKind,
  FileCommandBuilder,
  FileCommandEventType
} = require('../../files.js');
const {
  warn,
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/** Creates a `test` subcommand for the `create` command. */
exports.test = () =>
  new Command('test')
    .argument(
      '<name>',
      'A name of the page for which a test suite should be generated.'
    )
    .description('Generates a default test suite for the <name> page.')
    .action(async (pageName) => {
      const duration = Duration();

      const test = AssetBuilder(AssetKind.PageTest)
        .map(({source, destination: [base, name]}) => ({
          source,
          destination: [base, pageName, name]
        }))
        .build();

      const [testCopyResult] = await FilesManager()
        .guarded(
          FileCommandBuilder()
            .kind(FileCommandKind.CheckDestination)
            .destination(
              path.resolve(
                process.cwd(),
                Configuration.layouts,
                createLayoutFileName(pageName)
              )
            )
            .on(FileCommandEventType.Fail, () =>
              MessageBuilder()
                .line(
                  LineBuilder()
                    .text('The page')
                    .phrase(Typography.bold(pageName))
                    .phrase('does not exist')
                    .map(Typography.yellow)
                    .build()
                )
                .line(Separator.Empty)
                .line(
                  LineBuilder()
                    .padStart(2, Separator.Space)
                    .text(
                      'You may want to create a new page with a test suite with:'
                    )
                    .build()
                )
                .line(
                  LineBuilder()
                    .padStart(4, Separator.Space)
                    .text(`postdoc create page ${pageName} --test`)
                    .map(Typography.gray)
                    .build()
                )
                .line(Separator.Empty)
                .line(
                  LineBuilder()
                    .text(
                      'Please refer to the documentation for more information.'
                    )
                    .build()
                )
                .pipe(warn)
            )
            .build(),
          FileCommandBuilder()
            .source(test.source)
            .destination(test.destination)
            .map((content) =>
              content
                .replace('${port}', Configuration.devServer.port)
                .replace('${page}', pageName)
            )
            .build()
        )
        .execute();

      MessageBuilder()
        .lineIf(
          () => testCopyResult,
          () =>
            LineBuilder()
              .text(Typography.green(Symbols.Check))
              .phrase('A test suite for the')
              .phrase(Typography.green(pageName))
              .phrase('page is created.')
              .build()
        )
        .line(StatusLine(duration.until(performance.now()).toDate()).build())
        .pipe(info);
    });
