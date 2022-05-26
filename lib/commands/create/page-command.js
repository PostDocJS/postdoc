/**
 * @file Contains a functionality of the `create page` subcommand.
 */

const {Command} = require('commander');

const {File} = require('../../files.js');
const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {Configuration} = require('../../configuration/index.js');
const {LAYOUT_SUFFIX, URI_DELIMITER} = require('../../constants.js');
const {AssetKind, AssetBuilder} = require('../../assets/manager.js');
const {
  warn,
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
    .action(async (pageURI, {test}) => {
      const duration = Duration();

      /** @type {string[]} */
      const uriParts = pageURI.split(URI_DELIMITER);

      const pageName = uriParts[uriParts.length - 1];
      const prefixPageNames = uriParts.slice(0, uriParts.length - 1);

      const layout = AssetBuilder(AssetKind.Layout)
        .map(({source, destination: [base, _name]}) => ({
          source,
          destination: [base, ...prefixPageNames, pageName + LAYOUT_SUFFIX]
        }))
        .build();
      const section = AssetBuilder(AssetKind.Section)
        .map(({source, destination: [base, name]}) => ({
          source,
          destination: [base, ...uriParts, name]
        }))
        .build();

      const layoutCopyResult = await File()
        .setSource(layout.source)
        .setDestination(layout.destination)
        .write({ignore: false})
        .then((result) => {
          MessageBuilder()
            .line(
              LineBuilder()
                .text(Symbols.Exclamation)
                .phrase('The')
                .phrase(prefixPageNames.join(URI_DELIMITER) + URI_DELIMITER)
                .text(Typography.bold(pageName))
                .phrase('page alredy exists. Skipping...')
                .map(Typography.yellow)
                .build()
            )
            .pipeIf(() => !result, warn);

          return result;
        });

      const sectionCopyResult = await File()
        .setSource(section.source)
        .setDestination(section.destination)
        .map((content) => content.replace('${page}', pageName))
        .write({ignore: false})
        .then((result) => {
          MessageBuilder()
            .line(
              LineBuilder()
                .text(Symbols.Exclamation)
                .phrase('The default section for the')
                .phrase(prefixPageNames.join(URI_DELIMITER) + URI_DELIMITER)
                .text(Typography.bold(pageName))
                .phrase('page alredy exists. Skipping...')
                .map(Typography.yellow)
                .build()
            )
            .pipeIf(() => !result, warn);

          return result;
        });

      let testCopyResult = false;
      if (test) {
        const pageTest = AssetBuilder(AssetKind.PageTest)
          .map(({source, destination: [base, name]}) => ({
            source,
            destination: [base, ...uriParts, name]
          }))
          .build();

        testCopyResult = await File()
          .setSource(pageTest.source)
          .setDestination(pageTest.destination)
          .map((content) =>
            content
              .replace('${port}', Configuration.devServer.port)
              .replace('${page}', pageName)
          )
          .write({ignore: false})
          .then((result) => {
            MessageBuilder()
              .line(
                LineBuilder()
                  .text(Symbols.Exclamation)
                  .phrase('The default test suite for the')
                  .phrase(prefixPageNames.join(URI_DELIMITER) + URI_DELIMITER)
                  .text(Typography.bold(pageName))
                  .phrase('page alredy exists. Skipping...')
                  .map(Typography.yellow)
                  .build()
              )
              .pipeIf(() => !result, warn);

            return result;
          });
      }

      MessageBuilder()
        .lineIf(
          () => layoutCopyResult && sectionCopyResult,
          () =>
            LineBuilder()
              .text(Typography.green(Symbols.Check))
              .phrase('The')
              .phrase(
                Typography.gray.bold(
                  prefixPageNames.join(URI_DELIMITER) + URI_DELIMITER
                )
              )
              .text(Typography.green.bold(pageName))
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
              .phrase(
                Typography.gray.bold(
                  prefixPageNames.join(URI_DELIMITER) + URI_DELIMITER
                )
              )
              .text(Typography.green.bold(pageName))
              .phrase('page is created.')
              .build()
        )
        .line(StatusLine(duration.until(performance.now()).toDate()).build())
        .pipe(info);
    });
