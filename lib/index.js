import { env } from 'node:process';
import { createRequire } from 'node:module';

import Logger from './logger.js';
import Configuration from './configuration.js';
import PostDocCommand from './command.js';
import createRunCommand from './commands/run.js';
import createInitCommand from './commands/init.js';
import createTestCommand from './commands/test.js';
import createBuildCommand from './commands/build.js';
import createCreateCommand from './commands/create/index.js';
import createImportCommand from './commands/import.js';
import createPreviewCommand from './commands/preview.js';
import chalk from 'chalk';
import figlet from 'figlet';

const require = createRequire(import.meta.url);

function displayWelcomeBanner() {
  const bannerText = ' Postdoc';
  const data = figlet.textSync(bannerText, { font: 'Big', horizontalLayout: 'default' });
  const coloredBanner = chalk.rgb(255, 127, 80)(data  + '\n───────────────────────────────────────\n');

  // Print the banner
  console.log(coloredBanner);
}

export default async function createCLI() {
  await Configuration.initialise(env);

  Logger.initialise();
  displayWelcomeBanner();
  const postDocPackageDefinition = require('../package.json');

  return new PostDocCommand()
    .version(postDocPackageDefinition.version, '-v | --version', 'outputs the current Postdoc version.')
    .addCommand(createRunCommand())
    .addCommand(createInitCommand())
    .addCommand(createTestCommand())
    .addCommand(createBuildCommand())
    .addCommand(createImportCommand())
    .addCommand(createCreateCommand())
    .addCommand(createPreviewCommand());
}
