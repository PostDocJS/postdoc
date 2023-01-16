/**
 * @file Contains a functionality of the `create page` subcommand.
 */

const {Command} = require('commander');

const {File} = require('../../files.js');
const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Container} = require('../../utils/container.js');
const {Typography} = require('../../logger/colors.js');
const {CONFIGURATION_ID} = require('../../configuration/index.js');
const {AssetKind, AssetBuilder} = require('../../assets/manager.js');
const {LAYOUT_SUFFIX, URL_DELIMITER, MD_SUFFIX} = require('../../constants.js');
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

      const configuration = Container.get(CONFIGURATION_ID);

      /** @type {string[]} */
      const uriParts = pageURI.split(URL_DELIMITER);

      const pageName = uriParts[uriParts.length - 1];
      const prefixPageNames = uriParts.slice(0, uriParts.length - 1);

      const layout = AssetBuilder(AssetKind.Layout)
        .map(({source, destination: [base, _name]}) => ({
          source,
          destination: [base, ...prefixPageNames, pageName + LAYOUT_SUFFIX]
        }))
        .build();
      const content = AssetBuilder(AssetKind.Page)
        .map(({source, destination: [base, _name]}) => ({
          source,
          destination: [base, ...prefixPageNames, pageName + MD_SUFFIX]
        }))
        .build();

      let isLayoutWritten = false;
      let isContentWritten = false;
      let isTestSuiteWritten = false;

      if (!File().exists(layout.destination)) {
        await File(layout.source).write(layout.destination);

        isLayoutWritten = true;
      } else {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Exclamation)
              .phrase('The')
              .phrase(prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER)
              .text(Typography().bold(pageName))
              .phrase('page already exists. Skipping...')
              .map(Typography().yellow)
              .build()
          )
          .pipe(warn);
      }


      if (!File(content.destination).exists()) {
        await File(content.source)
          .map((content) => content.replace('${page}', pageName))
          .write(content.destination);

        isContentWritten = true;
      } else {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Exclamation)
              .phrase('The content for the')
              .phrase(prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER)
              .text(Typography().bold(pageName))
              .phrase('page already exists. Skipping...')
              .map(Typography().yellow)
              .build()
          )
          .pipe(warn);
      }


      if (test) {
        const pageTest = AssetBuilder(AssetKind.PageTest)
          .map(({source, destination: [base, name]}) => ({
            source,
            destination: [base, ...uriParts, name]
          }))
          .build();

        if (!File(pageTest.destination).exists()) {
          await File(pageTest.source)
            .map((content) =>
              content
                .replace('${port}', configuration.server.port)
                .replace('${page}', pageName)
            )
            .write(pageTest.destination);

          isTestSuiteWritten = true;
        } else {
          MessageBuilder()
            .line(
              LineBuilder()
                .text(Symbols.Exclamation)
                .phrase('The default test suite for the')
                .phrase(prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER)
                .text(Typography().bold(pageName))
                .phrase('page already exists. Skipping...')
                .map(Typography().yellow)
                .build()
            )
            .pipe(warn);
        }
      }

      MessageBuilder()
        .lineIf(
          () => isLayoutWritten && isContentWritten,
          () =>
            LineBuilder()
              .text(Typography().green(Symbols.Check))
              .phrase('The')
              .phrase(
                Typography().gray.bold(
                  prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER
                )
              )
              .text(Typography().green.bold(pageName))
              .phrase('page')
              .phrase(
                isTestSuiteWritten 
                  ? 'and a test suite are'
                  : 'is'
              )
              .phrase('created.')
              .build()
        )
        .lineIf(
          () => !(isLayoutWritten && isContentWritten) && isTestSuiteWritten,
          () =>
            LineBuilder()
              .text(Typography().green(Symbols.Check))
              .phrase('The test suite for the')
              .phrase(
                Typography().gray.bold(
                  prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER
                )
              )
              .text(Typography().green.bold(pageName))
              .phrase('page is created.')
              .build()
        )
        .line(StatusLine(duration.untilNow().toDate()).build())
        .pipe(info);
    });
