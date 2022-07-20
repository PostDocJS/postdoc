/**
 * @file Contains a command for creating the basic server-side component.
 */

const {Command} = require('commander');

const {File} = require('../../files.js');
const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {identity} = require('../../utils/fp.js');
const {Typography} = require('../../logger/colors.js');
const {AssetBuilder, AssetKind} = require('../../assets/manager.js');
const {URL_DELIMITER, EJS_SUFFIX} = require('../../constants.js');
const {MessageBuilder, StatusLine, info, LineBuilder, error} = require('../../logger/index.js');

/** Creates a `create include` command. */
exports.include = () =>
  new Command('include')
    .argument('<name>', 'Name of a new include.')
    .description('Creates a new include (server-side component).')
    .action(async (includeURI) => {
      const duration = Duration();

      /** @type {string[]} */
      const uriParts = includeURI.split(URL_DELIMITER);

      const includeName = uriParts[uriParts.length - 1];
      const prefixIncludeNames = uriParts.slice(0, uriParts.length - 1);

      const include = AssetBuilder(AssetKind.Include)
        .map(({source, destination: [base, _name]}) => ({
          source,
          destination: [base, ...prefixIncludeNames, includeName + EJS_SUFFIX]
        }))
        .build();

      const result = await File()
        .setSource(include.source)
        .setDestination(include.destination)
        .map((content) => content.replace('${name}', includeName))
        .write({ignore: false})
        .run();

      MessageBuilder()
        .line(
          LineBuilder()
            .text(Typography.red(Symbols.Cross))
            .phrase('The include')
            .phrase(
              prefixIncludeNames.length > 0
                ? prefixIncludeNames.join(URL_DELIMITER) + URL_DELIMITER
                : ''
            )
            .text(Typography.gray.bold(includeName))
            .phrase('was not created due to:')
            .build()
        )
        .line(
          LineBuilder()
            .text(result.mapErr((error) => error.message).extract(identity))
            .build()
        )
        .pipeIf(result.isErr, error);

      MessageBuilder()
        .line(
          LineBuilder()
            .text(Typography.green(Symbols.Check))
            .phrase('The include')
            .phrase(
              prefixIncludeNames.length > 0
                ? Typography.gray.bold(prefixIncludeNames.join(URL_DELIMITER) + URL_DELIMITER)
                : ''
            )
            .text(Typography.green.bold(includeName))
            .phrase('is created successfully.')
            .build()
        )
        .pipeIf(result.isOk, info);

      info(StatusLine(duration.untilNow().toDate()).build());
    });