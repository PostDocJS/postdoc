import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

import {Command} from 'commander';

import {run} from './commands/run/index.js';
import {init} from './commands/init/index.js';
import {test} from './commands/test/index.js';
import {File} from './files.js';
import {build} from './commands/build/index.js';
import {create} from './commands/create/index.js';
import {Container} from './utils/container.js';
import {
  CONFIGURATION_ID,
  initializeConfiguration
} from './configuration/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Initializes the PostDoc CLI.
 *
 * @returns {Promise<Command>}
 */
export const initializeCLI = async () => {
  const {version} = await File(join(__dirname, '..', 'package.json'))
    .map(JSON.parse)
    .content();

  const configuration = await initializeConfiguration();

  Container.set(CONFIGURATION_ID, configuration);

  return new Command()
    .version(version, '-v | --version', 'Outputs the PostDoc version.')
    .addCommand(run())
    .addCommand(init())
    .addCommand(test())
    .addCommand(build())
    .addCommand(create());
};
