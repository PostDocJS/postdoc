import {argv} from 'node:process';
import {spawn} from 'node:child_process';
import {basename, normalize} from 'node:path';

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

/**
 * Deleting paths to the same folders.
 *
 * @param {string[]} paths
 * @returns {string[]}
 */
const removeDuplicatePaths = (paths) => [...new Set(paths.map(path => basename(normalize(path))))];

/**
 * Processing folders and settings for Nightwatch CLI.
 * Combine folders with postdoc configuration and CLI configuration without duplicates.
 *
 * @param {string[]} postdocConfigFolders
 * @returns {string[]}
 */
const getNightwatchArgs = (postdocConfigFolders) => {
  const actualNightwatchArgs = argv.slice(4);

  const firstParamIndex = actualNightwatchArgs.findIndex((arg) => arg.includes('-'));

  const folderArgs = actualNightwatchArgs.slice(0, firstParamIndex);

  const paramArgs = actualNightwatchArgs.slice(firstParamIndex, actualNightwatchArgs.length);

  return [
    ...removeDuplicatePaths(postdocConfigFolders.concat(folderArgs)),
    ...paramArgs
  ];
};

/**
 * Creates a `test` subcommand. Runs {@link nightwatch} binary
 * in a subprocess, so this command can accept all options as the
 * `nightwatch` itself.
 */
export const test = () =>
  new Command('test')
    .description('Runs all test declared in the project.')
    .action(async () => {
      const duration = Duration();

      defineMode(Mode.Test);

      const {directories} = Container.get(CONFIGURATION_ID);

      const testsDirectories = Array.isArray(directories.tests) ? directories.tests : [directories.tests];

      const doTestsDirectoriesExist = testsDirectories.map(testDir => Directory(testDir).exists());

      if (doTestsDirectoriesExist.includes(false)) {
        return doTestsDirectoriesExist.forEach((doTestsDirectoryExist, index) => {
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
          }
        });
      }

      const nightwatchArgs = getNightwatchArgs(testsDirectories);

      spawn('npx', ['nightwatch', ...nightwatchArgs], {
        stdio: 'inherit',
        shell: true
      })
        .on('close', () =>
          MessageBuilder()
            .line(StatusLine(duration.untilNow().toDate()).build())
            .pipe(info)
        );
    });
