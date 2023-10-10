import {env} from 'node:process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

import {run} from './commands/run/index.js';
import {init} from './commands/init/index.js';
import {test} from './commands/test/index.js';
import {File} from './files.js';
import {Mode} from './mode.js';
import {build} from './commands/build/index.js';
import {create} from './commands/create/index.js';
import {Symbols} from './logger/symbols.js';
import {apidocs} from './commands/apidocs.js';
import {preview} from './commands/preview.js';
import {Container} from './utils/container.js';
import {Typography} from './logger/colors.js';
import {CustomCommand} from './utils/custom-command.js';
import {
  LineBuilder,
  MessageBuilder,
  Separator,
  warn
} from './logger/index.js';
import {
  CONFIGURATION_ID,
  initializeConfiguration
} from './configuration/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {import('./configuration/defaults.js').Configuration} configuration
 * @param {import('./configuration/resolve.js').ConfigurationAnalysis} analysis
 */
const examineConfigurationAnalysis = (configuration, analysis) => {
  if (analysis.isDefaultLanguageImplicit && env.MODE === Mode.Dev) {
    MessageBuilder()
      .line(
        LineBuilder()
          .text(Typography().yellow(Symbols.Exclamation))
          .phrase('The default language is implicitly set to "')
          .text(Typography().bold(configuration.i18n.defaultLanguage))
          .text('".')
          .build()
      )
      .line(
        LineBuilder()
          .padStart(2, Separator.Space)
          .text(
            'If you are using another language, please define it in the configuration file.'
          )
          .build()
      )
      .line(Separator.Empty)
      .pipe(warn);
  }
};

/**
 * Initializes the PostDoc CLI.
 *
 * @returns {Promise<CustomCommand>}
 */
export const initializeCLI = async () => {
  const {version} = await File(join(__dirname, '..', 'package.json'))
    .map(JSON.parse)
    .content();

  const {configuration, analysis} = await initializeConfiguration();

  Container.set(CONFIGURATION_ID, configuration);

  // We have to call this function after putting the configuration object
  // into the Container so logger can use it while showing warnings.
  examineConfigurationAnalysis(configuration, analysis);

  return new CustomCommand()
    .version(version, '-v | --version', 'Outputs the PostDoc version.')
    .addCommand(run())
    .addCommand(init())
    .addCommand(test())
    .addCommand(build())
    .addCommand(create())
    .addCommand(preview())
    .addCommand(apidocs(configuration));
};
