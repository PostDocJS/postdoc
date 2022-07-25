const {Command} = require('commander');

const {run} = require('./commands/run/index.js');
const {init} = require('./commands/init/index.js');
const {test} = require('./commands/test/index.js');
const {build} = require('./commands/build/index.js');
const {create} = require('./commands/create/index.js');
const {version} = require('../package.json');
const {Container} = require('./utils/container.js');
const {
  CONFIGURATION_ID,
  initializeConfiguration
} = require('./configuration/index.js');

/**
 * Initializes the PostDoc CLI.
 *
 * @returns {Promise<Command>}
 */
exports.initializeCLI = async () => {
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
