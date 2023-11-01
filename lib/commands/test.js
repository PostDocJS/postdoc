/**
 * Runs test suites using [nightwatch](https://github.com/nightwatchjs/nightwatch).
 * This command can accept any `nightwatch` CLI arguments after the `--` delimeter.
 * The `nightwatch` configuration file is taken into account while starting `nightwatch`
 * process.
 *
 * @example
 * postdoc test -- --headless
 *
 * @name test
 * @since 0.1.0
 */

import { argv } from "node:process";
import { spawn } from "node:child_process";
import { extname } from "node:path";
import { existsSync } from "node:fs";

import Logger from "../logger.js";
import Configuration from "../configuration.js";
import PostDocCommand from "../command.js";
import runAndMeasureAction from "./measured-action.js";

/**
 * Processing folders and settings for Nightwatch CLI.
 * Combine folders with postdoc configuration and CLI configuration without duplicates.
 *
 * @ignore
 * @param {string[]} postdocTestFolders
 * @returns {string[]}
 */
function getNightwatchArgs(postdocTestFolders) {
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
   *
   * @ignore
   */
  const actualNightwatchArgs = argv.slice(4);

  const firstParamIndex = actualNightwatchArgs.findIndex((arg) =>
    arg.includes("-"),
  );

  const folderArgs = actualNightwatchArgs.slice(0, firstParamIndex);

  for (const folderPath of folderArgs) {
    if (extname(folderPath) !== "") {
      Logger.log(
        (typography) => `
  				The ${typography.dim(folderPath)} is not a folder.
  				Please check if the path is correct and try again.
  			`,
        Logger.ErrorLevel,
      );

      return;
    }
  }

  const paramArgs = actualNightwatchArgs.slice(firstParamIndex);

  return [...new Set(postdocTestFolders.concat(folderArgs)), ...paramArgs];
};

export default function createTestCommand() {
  return new PostDocCommand("test")
    .description("Runs all test declared in the project.")
    .action(() =>
      runAndMeasureAction(async () => {
        const configuration = Configuration.get();

        const testsDirectories = Array.isArray(configuration.directories.tests)
          ? configuration.directories.tests
          : [configuration.directories.tests];

        for (const directoryRelativePath of testsDirectories) {
          if (!existsSync(resolve(directoryRelativePath))) {
            Logger.log(
              (typography) => `
    						The project doesn't have the ${typography.dim(directoryRelativePath)} directory.
    					`,
              Logger.WarningLevel,
            );

            return;
          }
        }

        const nightwatchArgs = getNightwatchArgs(testsDirectories);

        if (!nightwatchArgs) {
          // Something went wrong. Finish execution.
          return;
        }

        spawn("npx", ["nightwatch", ...nightwatchArgs], {
          stdio: "inherit",
          shell: true,
        });
      }),
    );
}
