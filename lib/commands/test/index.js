import {spawn} from 'node:child_process';
import {argv, exit} from 'node:process';
import {extname, resolve} from 'node:path';

import {Command} from 'commander';

import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Container} from '../../utils/container.js';
import {Directory} from '../../files.js';
import {Typography} from '../../logger/colors.js';
import {CONFIGURATION_ID} from '../../configuration/index.js';
import {defineMode, Mode} from '../../mode.js';
import {
  warn,
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';
import {CustomCommand} from '../../utils/custom-command.js';

/**
 * Deleting paths to the same folders.
 *
 * @param {string[]} paths
 * @returns {string[]}
 */
const removeDuplicatePaths = (paths) => [
  ...new Set(paths.map((path) => resolve(path)))
];

/**
 * Processing folders and settings for Nightwatch CLI.
 * Combine folders with postdoc configuration and CLI configuration without duplicates.
 *
 * @param {string[]} postdocConfigFolders
 * @returns {string[]}
 */
const getNightwatchArgs = (postdocConfigFolders) => {
  /**
   * The order of argv:
   * 1. node path
   * 2. bin/postdoc path
   * 3. "test" command
   * 4. "--" divider
   * 5. tests path (string/string[], "test" by default) and/or other options
   *
   * The command order must be:
   * postdoc test -- [tests] [args]
   *
   * @type {string[]}
   * @example
   * postdoc test
   * postdoc test -- test/src -o tests_output --headless
   * postdoc test -- -o tests_output --headless
   * postdoc test -- test/src test/lib -o tests_output --headless
   */
  const actualNightwatchArgs = argv.slice(4);

  const firstParamIndex = actualNightwatchArgs.findIndex((arg) =>
    arg.includes('-')
  );

  const folderArgs = actualNightwatchArgs.slice(0, firstParamIndex);

  const isDirectories = folderArgs.map((testDir) => extname(testDir) === '');

  // check if folders from cli args contain file path
  if (isDirectories.includes(false)) {
    isDirectories.forEach((isDir, index) => {
      if (!isDir) {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Typography().red(Symbols.Cross))
              .phrase('This path ("')
              .text(Typography().bold(folderArgs[index]))
              .text('") does not contain a directory.')
              .build()
          )
          .line(
            LineBuilder()
              .text('Please write the path with the directory and try again.')
              .build()
          )
          .pipe(warn);
      }
    });

    exit(1);
  }

  const paramArgs = actualNightwatchArgs.slice(
    firstParamIndex,
    actualNightwatchArgs.length
  );

  return [
    ...removeDuplicatePaths(postdocConfigFolders.concat(folderArgs)),
    ...paramArgs
  ];
};

/**
 * Runs test suites using [nightwatch](https://github.com/nightwatchjs/nightwatch).
 * This command can accept any `nightwatch` CLI arguments after the `--` delimeter.
 * The `nightwatch` configuration file is taken into account while starting `nightwatch`
 * process.
 *
 * @example
 * postdoc test -- --headless
 *
 * @since 0.1.0
 */
export const test = () =>
  new CustomCommand('test')
    .description('Runs all test declared in the project.')
    .action(async () => {
      const duration = Duration();

      defineMode(Mode.Test);

      const {directories} = Container.get(CONFIGURATION_ID);

      const testsDirectories = Array.isArray(directories.tests)
        ? directories.tests
        : [directories.tests];

      const doTestsDirectoriesExist = testsDirectories.map((testDir) =>
        Directory(testDir).exists()
      );

      if (doTestsDirectoriesExist.includes(false)) {
        return doTestsDirectoriesExist.forEach(
          (doTestsDirectoryExist, index) => {
            if (!doTestsDirectoryExist) {
              MessageBuilder()
                .line(
                  LineBuilder()
                    .text(Typography().red(Symbols.Cross))
                    .phrase('The project doesn\'t have a test ("')
                    .text(Typography().bold(testsDirectories[index]))
                    .text('") directory.')
                    .build()
                )
                .line(
                  LineBuilder()
                    .text('Please create at least one test suite')
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
            }
          }
        );
      }

      const nightwatchArgs = getNightwatchArgs(testsDirectories);

      spawn('npx', ['nightwatch', ...nightwatchArgs], {
        stdio: 'inherit',
        shell: true
      }).on('close', () =>
        MessageBuilder()
          .line(StatusLine(duration.untilNow().toDate()).build())
          .pipe(info)
      );
    });
