/**
 * Starts a development server.
 * This command is practically the same as running the `vite` command,
 * but with a PostDoc plugin. You can configure its behaviour through
 * the [server](https://vitejs.dev/config/server-options.html) options
 * in the `vite.config.{js|ts}` file. Also, the command supports two
 * CLI options:
 *
 * 1. `--host [url]` - exposes the dev server to the LAN and public addresses.
 * 2. `--open [url]` - automatically opens a browser on provided URL or `/index.html`
 *   if no argument is provided. To set the browser to open see
 *   [Vite's documentation](https://vitejs.dev/config/server-options.html#server-open).
 *
 * If a configuration file contains `apidocs` property with non-null `source`
 * field, then PostDoc will create API docs pages alongside regular ones.
 * {@see /apidocs/configuration.html}
 *
 * @name run
 * @since 0.1.0
 */

import process from 'node:process';
import openUrl, {apps} from 'open';
import { resolve } from 'node:path';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import inquirer from 'inquirer';
import jwt from 'jsonwebtoken';
import chalk from 'chalk';
import machineId from 'node-machine-id';

import Stream from '@halo-lab/stream';
import { watch } from 'chokidar';
import { createServer } from 'vite';

import Logger from '../logger.js';
import Collector from '../collector.js';
import Configuration from '../configuration.js';
import PostDocCommand from '../command.js';
import ViteConfiguration from '../vite.js';
import runAndMeasureAction from './measured-action.js';
import ProgressBar from 'progress';
import {exec} from 'child_process';


function generateMachineSpecificSecret() {
  const id = machineId.machineIdSync();

  const machineDetails = [
    id,
    os.platform(),
    os.arch()
  ].join('|');

  const hash = createHash('sha256').update(machineDetails).digest('hex');

  return hash;
}

async function generateToken(key) {
  const secret = generateMachineSpecificSecret();
  const payload = { key };
  const token = jwt.sign(payload, secret, { expiresIn: '30d' });

  return token;
}

async function promptForKey() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'key',
      message: 'Enter your BrowserStack access key:',
      validate(input) {
        if (input.trim() === '') {
          return 'Access key cannot be empty.';
        }
        return true;
      }
    }
  ]);
  return answers.key;
}

async function ensureConfigurationExists() {
  const homeDirectory = os.homedir();
  const postdocDirectory = path.join(homeDirectory, '.postdoc');
  const configFile = path.join(postdocDirectory, 'postdoc.json');

  if (fs.existsSync(postdocDirectory)) {
    fs.chmodSync(postdocDirectory, 0o700);
  } else {
    fs.mkdirSync(postdocDirectory, {recursive: true, mode: 0o700});
  }

  let configData = {};
  let key = '';

  if (fs.existsSync(configFile)) {
    configData = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const storedToken = configData.access_token?.key || '';

    if (storedToken) {
      key = decodeToken(storedToken);
    }
  }

  if (!key) {
    showInfoBanner();

    key = await promptForKey();
    const token = await generateToken(key);
    configData.access_token = { key: token };

    fs.writeFileSync(configFile, JSON.stringify(configData, null, 2));
    fs.chmodSync(configFile, 0o600);
    console.log(chalk.greenBright('\n🎉 Configuration successfully updated with your Access Key!'));

    await ensureDependencies();
  }

  return key;
}

function decodeToken(token) {
  const secret = generateMachineSpecificSecret();

  try {
    const decoded = jwt.verify(token, secret);
    return decoded.key;
  } catch (error) {
    console.log('\n' + chalk.red('The access token has expired or is invalid.'));
    return null;
  }
}

function showInfoBanner() {
  const bannerLines = [
    chalk.gray('\n ---------------------------------------------------'),
    `${chalk.white(' 🔒 Welcome to')} ${chalk.bold.white('Postdoc Remote')} ${chalk.white('setup 🔑')}`,
    chalk.gray(' ---------------------------------------------------'),
    '',
    `${chalk.white('Postdoc uses the BrowserStack platform to provision cloud devices and browsers. Follow the steps below to configure your access:')} `,
    `${chalk.white('  1.')} ${chalk.white('🌐 Visit https://browserstack.com and sign up or log in (free trial available);')}`,
    `${chalk.white('  2.')} ${chalk.white('🔑 Retrieve your Access Key from the "Automate" section.')}`,
    `${chalk.white('  3.')} ${chalk.white('📋 Paste your key below when prompted.')}`,
    '',

    chalk.white('Note: this setup will also install the "browserstack-local" package as a dependency.'),
    chalk.white('Let’s get started! 🚀'),
    '',
  ];

  console.log(bannerLines.join('\n'));
}

function ensureDependencies() {
  return new Promise((resolve, reject) => {
    const bar = new ProgressBar(':bar Installing browserstack-local...', { total: 10 });
    const timer = setInterval(() => {
      bar.tick();
      if (bar.complete) {
        clearInterval(timer);
        resolve();
      }
    }, 100);

    const install = exec('npm install browserstack-local');
    install.stderr.on('data', (data) => {
      console.error(`Error: ${data}`);
    });

    install.on('close', (code) => {
      if (code !== 0) {
        console.error(chalk.red('Failed to install browserstack-local'));
        reject();
      } else {
        resolve();
      }
    });

  });
}


function createWatcher() {
  const configuration = Configuration.get();

  const pagesDirectoryGlob = resolve(
    configuration.directories.content,
    '**',
    '*'
  );
  const layoutsDirectoryGlob = resolve(
    configuration.directories.layouts,
    '**',
    '*'
  );
  const includesDirectoryGlob = resolve(
    configuration.directories.includes,
    '**',
    '*'
  );
  const apidocsGlob = configuration.apidocs.source &&
    resolve(
      configuration.apidocs.source,
      '**',
      '*'
    );

  const watcherOptions = {
    ignoreInitial: true
  };

  return Stream.from((send) => {
    function setUpListeners(watcher) {
      return watcher
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
    }

    const pagesWatcher = setUpListeners(
      watch(pagesDirectoryGlob, watcherOptions)
    );
    const layoutsWatcher = setUpListeners(
      watch(layoutsDirectoryGlob, watcherOptions)
    );
    const includesWatcher = setUpListeners(
      watch(includesDirectoryGlob, watcherOptions)
    );
    const apidocsWatcher = apidocsGlob && setUpListeners(
      watch(apidocsGlob, watcherOptions)
    );

    return async () => {
      await pagesWatcher.close();
      await layoutsWatcher.close();
      await includesWatcher.close();
      if (apidocsWatcher) {
        await apidocsWatcher.close();
      }
    };
  });
}

async function runBrowserStackLocal({spinner, key, localOptions} = {}) {
  let browserstack = null;

  try {
    browserstack = await import('browserstack-local');
  } catch (error) {
    spinner.fail();
    console.error(error)
    console.info('\nPostdoc requires browserstack-local to be able to run on remote devices. Please install it with:\n' +
      '\tnpm install browserstack-local\n\n' +
      'You also need to create a BrowserStack account (free trial supported) and set the BROWSERSTACK_ACCESS_KEY environment variable.\n'
    );
    process.exit(1);
  }

  if (!key) {
    spinner.fail();
    console.error('\nMissing BrowserStack access key.\n')
    process.exit(1);
  }

  const bsLocal = new browserstack.Local();

  return new Promise((resolve, reject) => {
    bsLocal.start(
      {
        key,
        force: true,
        ...localOptions
      }, (error) => {
        if (error) {
          spinner.fail('Failed to start BrowserStackLocal. Please check your access key.');
          reject(error);
        } else {
          resolve(bsLocal);
        }
      }
    );
  });
}

export default function createRunCommand() {
  const configuration = Configuration.get();

  const getBrowserstackUrl = (configName, listenUrl) => {
    const bstConfig = configuration.remote.configurations[configName];
    if (!bstConfig) {
      return null;
    }


    let url = `https://live.browserstack.com/dashboard?utm_campaign=quick-launch#start=true&autofit=true&os=${bstConfig.os}&os_version=${bstConfig.os_version}&device_browser=${bstConfig.device_browser}&device=${bstConfig.device}&zoom_to_fit=true&full_screen=true&url=${encodeURIComponent(listenUrl)}&speed=1`;
    if (bstConfig.browser_version) {
      url += `&browser_version=${bstConfig.browser_version}`;
    }

    return url;
  }

  return new PostDocCommand('run')
    .option(
      '-h | --host [url]',
      'Listen on all available network interfaces.'
    )
    .option(
      '-o | --open [browser]',
      'Automatically open the local dev server url in the designated browser (safari, chrome, edge, firefox).'
    )
    .option(
      '-r | --remote [remote]',
      'Automatically provision a remote device on BrowserStack and connect it to the local dev server.'
    )
    .description('Start the Vite-powered development server with live preview and Hot Module Replacement (HMR).')
    .action(({ open, host, remote }) =>
      runAndMeasureAction(async () => {
        let bsLocal = null;

        const collector = new Collector(true);
        await collector.collectPages();

        const serverOptions = {
          host
        }

        if (open) {
          serverOptions.open = open;
        }

        if (remote) {
          serverOptions.host = true;
        }

        const inlineConfig = ViteConfiguration.createForDevelopment(collector, {
          server: serverOptions
        });

        const server = await createServer(inlineConfig);
        await server.listen();

        Logger.log(
          () => `
            Server is listening on:
              - ${server.resolvedUrls.local.join(' | ')}
              ${
  server.resolvedUrls.network.length
    ? '- ' + server.resolvedUrls.network.join(' | ')
    : ''
}
          `,
          Logger.SuccessLevel
        );

        const events = createWatcher();

        const unsubscribe = Stream.forEach(events, async () => {
          await collector.collectPages();

          server.ws.send('postdoc:reload-page');
        });

        process.on('SIGINT', async () => {
          if (bsLocal) {
            console.log('Closing BrowserStackLocal...')

            bsLocal.stop(function() {
              console.log("Stopped BrowserStackLocal");
              process.exit(0);
            });
          } else {
            process.exit(0);
          }
        });

        process.on('beforeExit', async () => {
          if (bsLocal) {
            bsLocal.stop(function() {
              console.log("Stopped BrowserStackLocal");
            });
          }

          console.log('Shutting down server...')
          await server.close();
          await unsubscribe();
          await collector.clear();
        });

        if (remote) {
          if (server.resolvedUrls?.network[0]) {
            const availableConfigs = `\n Available configurations: ${Object.keys(configuration.remote.configurations).map(item => `\n - ${chalk.greenBright(item)}`).join('')}`;

            if (remote === true) {
              console.log();
              Logger.log(() => `No remote configuration defined. Please specify a configuration name with --remote=<configName>. ${availableConfigs}`,
                Logger.WarningLevel);
              return;
            }

            const key = await ensureConfigurationExists();
            const liveUrl = getBrowserstackUrl(remote, server.resolvedUrls.network[0]);
            if (!liveUrl) {
              Logger.log(() => `
                No remote configuration found for "${remote}". Please check your postdoc.config.js file.`,
                Logger.WarningLevel
              );
              return;
            }

            const spinner = Logger.spinner(`Opening Browserstack Live at ${liveUrl}`)
            const browser = configuration.remote.browser;

            const opts = {}
            if (browser && apps[browser]) {
              opts.app = {
                name: apps[browser]
              }
            }

            const localOptions = configuration.remote?.localOptions ?? {};
            bsLocal = await runBrowserStackLocal({spinner, key, localOptions});
            await openUrl(liveUrl, opts);
            spinner.succeed();
          } else {
            Logger.log(() => `
               Browserstack Live requires a network URL. Run postdoc with --host option.
              `,
              Logger.WarningLevel
            );
          }
        }
      })
    );
}

