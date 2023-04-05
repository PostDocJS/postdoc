/**
 * @file Contains a functionality of the `create test` subcommand.
 */

import {join} from 'node:path';

import {Command} from 'commander';
import {resolveConfig} from 'vite';

import {File} from '../../files.js';
import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Container} from '../../utils/container.js';
import {Typography} from '../../logger/colors.js';
import {CONFIGURATION_ID} from '../../configuration/index.js';
import {defineMode, Mode} from '../../mode.js';
import {AssetKind, AssetBuilder} from '../../assets/manager.js';
import {MD_SUFFIX, URL_DELIMITER} from '../../constants.js';
import {
  warn,
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

/** Creates a `test` subcommand for the `create` command. */
export const test = () =>
  new Command('test')
    .argument(
      '<name>',
      'A name of the page for which a test suite should be generated.'
    )
    .description('Generates a default test suite for the <name> page.')
    .action(async (pageURI) => {
      const duration = Duration();

      defineMode(Mode.Creation);

      const configuration = Container.get(CONFIGURATION_ID);

      /** @type {string[]} */
      const uriParts = pageURI.split(URL_DELIMITER);

      const pageName = uriParts[uriParts.length - 1];
      const prefixPageNames = uriParts.slice(0, uriParts.length - 1);

      const test = AssetBuilder(AssetKind.PageTest)
        .map(({source, destination: [base, name]}) => ({
          source,
          destination: [base, ...uriParts, name]
        }))
        .build();

      if (
        !File(join(
          configuration.directories.pages,
          ...prefixPageNames,
          pageName + MD_SUFFIX
        )).exists()
      ) {
        return MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Exclamation)
              .phrase('The page')
              .phrase(prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER)
              .text(Typography().bold(pageName))
              .phrase('does not exist.')
              .map(Typography().yellow)
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
              .map(Typography().gray)
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

      const viteConfig = await resolveConfig({}, 'serve', 'development', 'development');

      if (!File(test.destination).exists()) {
        await File(test.source)
          .map((content) =>
            content
              .replace('${port}', viteConfig.server.port || 5173)
              .replace('${page}', pageName)
          )
          .write(test.destination);

        MessageBuilder()
          .line(
            LineBuilder()
              .text(Typography().green(Symbols.Check))
              .phrase('A test suite for the')
              .phrase(
                Typography().gray.bold(
                  prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER
                )
              )
              .text(Typography().green.bold(pageName))
              .phrase('page is created.')
              .build()
          )
          .pipe(info);
      } else {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Exclamation)
              .phrase('The default test suite for the')
              .phrase(prefixPageNames.join(URL_DELIMITER) + URL_DELIMITER)
              .text(Typography().bold(pageName))
              .phrase('page already exist. Skipping...')
              .map(Typography().yellow)
              .build()
          )
          .pipe(warn);
      }

      info(StatusLine(duration.untilNow().toDate()).build());
    });
