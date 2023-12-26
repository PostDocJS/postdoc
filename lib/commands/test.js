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

      const testsDirectories = Array.isArray(configuration.directories.tests) ? configuration.directories.tests : [configuration.directories.tests];
      const nightwatchArgs = testsDirectories.concat(nightwatchOptions);

      const childProcess = spawn(process.execPath, ['node_modules/.bin/nightwatch', ...nightwatchArgs], {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        detached: false
      });

      childProcess.on('error', (error) => {
        Logger.log(() => error.message, Logger.ErrorLevel);
      });
    });
}
