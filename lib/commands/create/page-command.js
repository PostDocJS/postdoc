/**
 * @file Contains a functionality of the `create page` subcommand.
 */

import {Command} from 'commander';

import {File} from '../../files.js';
import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Container} from '../../utils/container.js';
import {Typography} from '../../logger/colors.js';
import {CONFIGURATION_ID} from '../../configuration/index.js';
import {defineMode, Mode} from '../../mode.js';
import {AssetKind, AssetBuilder} from '../../assets/manager.js';
import {URL_DELIMITER, MD_EXTENSION, HTML_EXTENSION} from '../../constants.js';
import {
  warn,
  info,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

/** Creates a `page` subcommand for the `create` command. */
export const page = () =>
  new Command('page')
    .argument(
      '<name>',
      'Name of a new page. It will be served as a URL path also.'
    )
    .option('-t | --test', 'Generates a test for the <name> page.', false)
    .description('Creates a new page that will be available with /<name> URL.')
    .action(async (pageURI, {test}) => {
      const duration = Duration();

      defineMode(Mode.Creation);

      const configuration = Container.get(CONFIGURATION_ID);

      /** @type {string[]} */
      const uriParts = pageURI.split(URL_DELIMITER);

      const pageName = uriParts[uriParts.length - 1];
      const prefixPageNames = uriParts.slice(0, uriParts.length - 1);

      const content = AssetBuilder(AssetKind.Page)
        .map(({source, destination: [base, _name]}) => ({
          source,
          destination: [base, ...prefixPageNames, pageName + MD_EXTENSION]
        }))
        .build();

      let isContentFileWritten = false;
      let isTestSuiteWritten = false;

      if (!File(content.destination).exists()) {
        await File(content.source)
          .map((content) => content.replace('${page}', pageName))
          .write(content.destination);

        isContentFileWritten = true;
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
          () => isContentFileWritten,
          () =>
            LineBuilder()
              .text(Typography().green(Symbols.Check))
              .phrase('The')
              .phrase(
                Typography().gray.bold(
                  prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER
                )
              )
              .text(Typography().green.bold(pageName + HTML_EXTENSION))
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
          () => !isContentFileWritten && isTestSuiteWritten,
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
