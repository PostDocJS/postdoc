/**
 * @file Contains the definition of the `apidocs` command.
 */

import Future from '@halo-lab/future';

import {Symbols} from '../logger/symbols.js';
import {Duration} from '../utils/date.js';
import {Container} from '../utils/container.js';
import {Typography} from '../logger/colors.js';
import {CustomCommand} from '../utils/custom-command.js';
import {CONFIGURATION_ID} from '../configuration/index.js';
import {Mode, defineMode} from '../mode.js';
import {generateApiDocFiles} from '../apidocs/index.js';
import {LineBuilder, MessageBuilder, StatusLine, info} from '../logger/index.js';

/**
 * Crates an `apidocs` command for the PostDoc CLI.
 *
 * @param {import('../configuration/defaults.js').Configuration} configuration
 */
export const apidocs = (configuration) =>
  new CustomCommand('apidocs')
    .argument('<sourceDirectory>', 'A path to the source directory of the JavaScript files to extract the comments from.')
    .option('-o | --output [output]', 'An output directory name where the MD or EJS files should be created.', configuration.apidocs.outputDirectory)
    .option('-t | --template [template]', 'A path to the template that is used in the generation process.', configuration.apidocs.template)
    .action((sourceDirectory, {output, template}) => {
      const duration = Duration();

      defineMode(Mode.ApiDocsGeneration);
	
      return Future.map(
        generateApiDocFiles(Container.get(CONFIGURATION_ID), sourceDirectory, output, template),
        () => 
          MessageBuilder()
            .line(
              LineBuilder()
                .text(Typography().green(Symbols.Check))
                .phrase('Apidoc pages are successfully generated.')
                .build()
            )
            .line(StatusLine(duration.untilNow().toDate()).build())
            .pipe(info)
      );
    });
