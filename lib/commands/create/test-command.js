/**
 * @file Contains a functionality of the `create test` subcommand.
 */

const path = require('path');
const {performance} = require('perf_hooks');

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
    .action(async (pageURI) => {
      const duration = Duration();

      /** @type {string[]} */
      const uriParts = pageURI.split(URI_DELIMITER);

      const pageName = uriParts[uriParts.length - 1];
      const prefixPageNames = uriParts.slice(0, uriParts.length - 1);

      const test = AssetBuilder(AssetKind.PageTest)
        .map(({source, destination: [base, name]}) => ({
          source,
          destination: [base, ...uriParts, name]
        }))
        .build();

      if (
        !File()
          .setSource(
            path.resolve(
              process.cwd(),
              Configuration.directories.pages,
              ...prefixPageNames,
              pageName + LAYOUT_SUFFIX
            )
          )
          .exists()
      ) {
        return MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Exclamation)
              .phrase('The page')
              .phrase(prefixPageNames.join(URI_DELIMITER) + URI_DELIMITER)
              .text(Typography.bold(pageName))
              .phrase('does not exist.')
              .map(Typography.yellow)
              .build()
          )
          .line(Separator.Empty)
          .line(
            LineBuilder()
              .padStart(2, Separator.Space)
              .text('You may want to create a new page with a test suite with:')
              .build()
          )
          .line(
            LineBuilder()
              .padStart(4, Separator.Space)
              .text(`postdoc create page ${pageURI} --test`)
              .map(Typography.gray)
              .build()
          )
          .line(Separator.Empty)
          .line(
            LineBuilder()
              .text('Please refer to the documentation for more information.')
              .build()
          )
          .pipe(warn);
      }

      const testCopyResult = await File()
        .setSource(test.source)
        .setDestination(test.destination)
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
                .phrase('page already exist. Skipping...')
                .map(Typography.yellow)
                .build()
            )
            .pipeIf(() => !result, warn);

          return result;
        });

      MessageBuilder()
        .lineIf(
          () => testCopyResult,
          () =>
            LineBuilder()
              .text(Typography.green(Symbols.Check))
              .phrase('A test suite for the')
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
