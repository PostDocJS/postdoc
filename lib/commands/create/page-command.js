/**
 * @file Contains a functionality of the `create page` subcommand.
 */

const {Command} = require('commander');

const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {Configuration} = require('../../configuration/index.js');
const {createLayoutFileName} = require('../../assets/helpers.js');
const {AssetKind, AssetBuilder} = require('../../assets/manager.js');
const {FilesManager, FileCommandBuilder} = require('../../files.js');
const {
  info,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/** Creates a `page` subcommand for the `create` command. */
exports.page = () =>
  new Command('page')
    .argument(
      '<name>',
      'Name of a new page. It will be served as a URL path also.'
    )
    .option('--test', 'Generates a test for the <name> page.', false)
    .description('Creates a new page that will be available with /<name> URL.')
    .action(async (pageName, {test}) => {
      const duration = Duration();

      const layout = AssetBuilder(AssetKind.Layout)
        .map(({source, destination: [base, _name]}) => ({
          source,
          destination: [base, createLayoutFileName(pageName)]
        }))
        .build();
      const section = AssetBuilder(AssetKind.Section)
        .map(({source, destination: [base, name]}) => ({
          source,
          destination: [base, pageName, name]
        }))
        .build();

      const [layoutCopyResult, sectionCopyResult, testCopyResult] =
        await FilesManager()
          .command(
            FileCommandBuilder()
              .source(layout.source)
              .destination(layout.destination)
              .build()
          )
          .command(
            FileCommandBuilder()
              .source(section.source)
              .destination(section.destination)
              .map((content) => content.replace('${page}', pageName))
              .build()
          )
          .commandIf(
            () => test,
            () => {
              const pageTest = AssetBuilder(AssetKind.PageTest)
                .map(({source, destination: [base, name]}) => ({
                  source,
                  destination: [base, pageName, name]
                }))
                .build();

              return FileCommandBuilder()
                .source(pageTest.source)
                .destination(pageTest.destination)
                .map((content) =>
                  content
                    .replace('${port}', Configuration.devServer.port)
                    .replace('${page}', pageName)
                )
                .build();
            }
          )
          .execute();

      MessageBuilder()
        .lineIf(
          () => layoutCopyResult && sectionCopyResult,
          () =>
            LineBuilder()
              .text(Typography.green(Symbols.Check))
              .phrase('The')
              .phrase(Typography.green(pageName))
              .phrase('page')
              .phrase(testCopyResult ? 'and a test suite are' : 'is')
              .phrase('created.')
              .build()
        )
        .lineIf(
          () => !(layoutCopyResult && sectionCopyResult) && testCopyResult,
          () =>
            LineBuilder()
              .text(Typography.green(Symbols.Check))
              .phrase('The test suite for the')
              .phrase(Typography.green(pageName))
              .phrase('page is created.')
              .build()
        )
        .line(StatusLine(duration.until(performance.now()).toDate()).build())
        .pipe(info);
    });
