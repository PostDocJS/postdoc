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

import process from 'node:process';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import Stream from '@halo-lab/stream';
import { watch } from 'chokidar';
import { pipeWith } from 'pipe-ts';

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
      const isInWatchMode = nightwatchOptions.includes('--watch') || configuration.nightwatch.watch;
      const nightwatchArgs = testsDirectories.concat(nightwatchOptions.filter((value) => value !== '--watch')).concat(mapConfigItems(configuration.nightwatch));

      const args = ['node_modules/.bin/nightwatch', ...nightwatchArgs];

      await waitUntilChildProcessFinishes(runNightwatch(args));

      if (isInWatchMode) {
        let isIdle = true;
        const testsGlobs = testsDirectories.map((directory) => resolve(directory, '**', '*'));

        const stopWatching = pipeWith(
          createWatcher(testsGlobs),
          Stream.filter(() => isIdle),
          Stream.forEach(() => {
            isIdle = false;

            waitUntilChildProcessFinishes(runNightwatch(args))
              .then(() => (isIdle = true));
          })
        );

        process
          .on('beforeExit', stopWatching)
          .on('uncaughtException', stopWatching)
          .on('unhandledRejection', stopWatching);
      }
    });
}

function createWatcher(globs) {
  const watcherOptions = {
    ignoreInitial: true
  };

  return Stream.from((send) => {
    const watcher = watch(globs, watcherOptions)
      .on('add', (path, stats) =>
        send({
          kind: 'add',
          path,
          stats
        })
      )
      .on('change', (path, stats) =>
        send({
          kind: 'change',
          path,
          stats
        })
      )
      .on('unlink', (path, stats) =>
        send({
          kind: 'remove',
          path,
          stats
        })
      );

    return () => watcher.close();
  });
}

function runNightwatch(args) {
  const childProcess = spawn(process.execPath, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    detached: false
  });

  childProcess.on('error', (error) => {
    Logger.log(() => error.message, Logger.ErrorLevel);
  });

  return childProcess;
}

async function waitUntilChildProcessFinishes(childProcess) {
  await new Promise((resolve) => {
    childProcess.on('close', resolve);
  });
}

function mapConfigItems(configuration) {
  return Object.keys(configuration).reduce((result, configItem) => {
    const value = configuration[configItem];

    switch (configItem) {
      case 'headless':
        if (value) {
          result.push('--headless');
        }
        break;

      case 'parallel':
        if (value) {
          result.push('--parallel');
        }
        break;
      case 'browser': {
        let browser = '';
        if (typeof value === 'string') {
          browser = value;
        } else if (Array.isArray(value)) {
          browser = value.join(',');
        }

        result.push(`--env ${browser}`);
        break;
      }
    }

    return result;
  }, []);
}
