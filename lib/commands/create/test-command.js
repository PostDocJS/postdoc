import {exit} from 'node:process';
import {sep, join, extname} from 'node:path';

import {Command} from 'commander';
import {resolveConfig} from 'vite';

import {File} from '../../files.js';
import {Duration} from '../../utils/date.js';
import {defineMode, Mode} from '../../mode.js';
import {Symbols} from '../../logger/symbols.js';
import {Typography} from '../../logger/colors.js';
import {Container} from '../../utils/container.js';
import {DEFAULTS} from '../../configuration/defaults.js';
import {MD_EXTENSION, URL_DELIMITER} from '../../constants.js';
import {CONFIGURATION_ID} from '../../configuration/index.js';
import {AssetKind, AssetBuilder} from '../../assets/manager.js';
import {
  warn,
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder,
  error as logError
} from '../../logger/index.js';

/**
 * Creates a test suite for the provided page.
 *
 * @since 0.1.0
 */
export const test = () =>
  new Command('test')
    .argument(
      '<page_path>',
      'Path to the page for which a test suite should be generated.'
    )
    .option(
      '-o | --output [path]',
      'Test path where to place the generated test.'
    )
    .description('Generates a default test suite for the <page_path> page.')
    .action(async (pagePath, options) => {
      const duration = Duration();

      defineMode(Mode.Create);

      const configuration = Container.get(CONFIGURATION_ID);

      /** @type {string[]} */
      const uriParts = pagePath.split(URL_DELIMITER);

      const testExtension = '.js';

      const pageName = uriParts[uriParts.length - 1];
      const prefixPageName = uriParts
        .slice(0, uriParts.length - 1)
        .join(URL_DELIMITER);

      /**
       * @type {string[]}
       */
      const testsDirectories = Array.isArray(configuration.directories.tests)
        ? configuration.directories.tests
        : [configuration.directories.tests];

      // check if postdoc config and cli option --output contain file path
      const isDirectories = [
        ...testsDirectories,
        ...(options.output ? [options.output] : [])
      ].map((testDir) => extname(testDir) === '');

      if (isDirectories.includes(false)) {
        return isDirectories.forEach((isDir, index) => {
          if (!isDir) {
            MessageBuilder()
              .line(
                LineBuilder()
                  .text(Typography().red(Symbols.Cross))
                  .phrase('This path ("')
                  .text(Typography().bold(testsDirectories[index]))
                  .text('") does not contain a directory.')
                  .build()
              )
              .line(
                LineBuilder()
                  .text(
                    'Please, write the path with the directory and repeat again.'
                  )
                  .build()
              )
              .line(StatusLine(duration.untilNow().toDate()).build())
              .pipe(warn);
          }
        });
      }

      const outputTest = options.output
        ? testsDirectories.find(
          (testDirectories) =>
            testDirectories.split(sep).pop() === options.output
        )
        : prefixPageName;

      if (!outputTest) {
        return MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Exclamation)
              .phrase('The test dir')
              .phrase(
                DEFAULTS.directories.tests + URL_DELIMITER + options.output
              )
              .phrase('not defined in the postdoc configuration file.')
              .map(Typography().yellow)
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

      const test = AssetBuilder(AssetKind.PageTest)
        .map(({source, destination: [base]}) => {
          const destination = options.output
            ? [outputTest, pageName + testExtension]
            : typeof base === 'string'
              ? [base, outputTest, pageName + testExtension]
              : Object.values(base).length < 2
                ? [Object.values(base)[0], outputTest, pageName + testExtension]
                : null;

          if (!destination) {
            MessageBuilder()
              .line(
                LineBuilder()
                  .text(
                    'It is impossible to determine where the test file should be written.'
                  )
                  .build()
              )
              .line(
                'Add the option -o | --output and specify the path where to write the test file.'
              )
              .map(Typography().red)
              .pipe(logError);

            exit(1);
          }

          return {source, destination};
        })
        .build();

      if (
        !File(
          join(
            configuration.directories.pages,
            prefixPageName,
            pageName + MD_EXTENSION
          )
        ).exists()
      ) {
        return MessageBuilder()
          .line(
            LineBuilder()
              .text(Symbols.Exclamation)
              .phrase('The page')
              .phrase(outputTest + URL_DELIMITER)
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
              .text(`postdoc create page ${pagePath} --test`)
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

      const viteConfig = await resolveConfig(
        {},
        'serve',
        'development',
        'development'
      );

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
              .phrase(Typography().gray.bold(outputTest + URL_DELIMITER))
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
              .phrase(outputTest + URL_DELIMITER)
              .text(Typography().bold(pageName))
              .phrase('page already exist. Skipping...')
              .map(Typography().yellow)
              .build()
          )
          .pipe(warn);
      }

      info(StatusLine(duration.untilNow().toDate()).build());
    });
