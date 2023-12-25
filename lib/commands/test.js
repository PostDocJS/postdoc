/**
 * Runs test suites using [nightwatch](https://github.com/nightwatchjs/nightwatch).
 * This command can accept any `nightwatch` CLI arguments.
 * The `nightwatch` configuration file is taken into account while starting
 * a `nightwatch` process.
 *
 * @example
 * postdoc test --headless
 *
 * @name test
 * @since 0.1.0
 */

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

import Logger from '../logger.js';
import Configuration from '../configuration.js';
import PostDocCommand from '../command.js';

export default function createTestCommand() {
  return new PostDocCommand('test')
    .argument('[nightwatchOptions...]', 'A list of any nightwatch related values')
    .allowUnknownOption()
    .description('Runs all test declared in the project.')
    .action(async (nightwatchOptions) => {
      const configuration = Configuration.get();

      const testsDirectories = Array.isArray(configuration.directories.tests)
        ? configuration.directories.tests
        : [configuration.directories.tests];

      for (const directoryRelativePath of testsDirectories) {
        if (!existsSync(resolve(directoryRelativePath))) {
          Logger.log(
            (typography) => `
    						The project doesn't have the ${typography.dim(
    directoryRelativePath
  )} directory.
    					`,
            Logger.WarningLevel
          );

          return;
        }
      }

      const nightwatchArgs = testsDirectories.concat(nightwatchOptions);

      const child = spawn('./node_modules/.bin/nightwatch', nightwatchArgs, {
        shell: true,
        stdio: 'inherit',
        detached: false
      });

      child.on('error', (error) => {
        Logger.log(() => error.message, Logger.ErrorLevel);
      });
    });
}
