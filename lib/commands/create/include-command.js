/**
 * @file Contains a command for creating the basic server-side component.
 */

import {Command} from 'commander';

import {File} from '../../files.js';
import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Typography} from '../../logger/colors.js';
import {defineMode, Mode} from '../../mode.js';
import {AssetBuilder, AssetKind} from '../../assets/manager.js';
import {URL_DELIMITER, EJS_EXTENSION} from '../../constants.js';
import {
  warn,
  info,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

/** Creates a `create include` command. */
export const include = () =>
  new Command('include')
    .argument('<name>', 'Name of a new include.')
    .description('Creates a new include (server-side component).')
    .action(async (includeURI) => {
      const duration = Duration();

      defineMode(Mode.Creation);

      /** @type {string[]} */
      const uriParts = includeURI.split(URL_DELIMITER);

      const includeName = uriParts[uriParts.length - 1];
      const prefixIncludeNames = uriParts.slice(0, uriParts.length - 1);

      const include = AssetBuilder(AssetKind.Include)
        .map(({source, destination: [base, _name]}) => ({
          source,
          destination: [
            base,
            ...prefixIncludeNames,
            includeName + EJS_EXTENSION
          ]
        }))
        .build();

      if (!File(include.destination).exists()) {
        await File(include.source)
          .map((content) => content.replace('${name}', includeName))
          .write(include.destination);

        MessageBuilder()
          .line(
            LineBuilder()
              .text(Typography().green(Symbols.Check))
              .phrase('The include')
              .phrase(
                prefixIncludeNames.length > 0
                  ? Typography().gray.bold(
                    prefixIncludeNames.join(URL_DELIMITER) + URL_DELIMITER
                  )
                  : ''
              )
              .text(Typography().green.bold(includeName))
              .phrase('is created successfully.')
              .build()
          )
          .pipe(info);
      } else {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Typography().red(Symbols.Cross))
              .phrase('The')
              .phrase(
                prefixIncludeNames.length > 0
                  ? prefixIncludeNames.join(URL_DELIMITER) + URL_DELIMITER
                  : ''
              )
              .text(Typography().gray.bold(includeName))
              .phrase('include already exists. Skipping...')
              .build()
          )
          .pipe(warn);
      }

      info(StatusLine(duration.untilNow().toDate()).build());
    });
