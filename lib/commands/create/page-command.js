/**
 * @file Contains a functionality of the `create page` subcommand.
 */

const path = require('path');

const {Command} = require('commander');

const {uid} = require('../../utils/crypto.js');
const {Symbols} = require('../../logger/symbols.js');
const {Duration} = require('../../utils/date.js');
const {Typography} = require('../../logger/colors.js');
const {Configuration} = require('../../configuration/index.js');
const {
  AssetKind,
  AssetsManager,
  AssetCommandBuilder
} = require('../../assets/manager.js');
const {
  info,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/**
 * A main body of the success message.
 *
 * @param {string} name
 * @param {boolean} test
 */
const successMessage = (name, test) =>
  MessageBuilder().line(
    LineBuilder()
      .text(Typography.green(Symbols.Check))
      .phrase('The')
      .phrase(Typography.green(name))
      .phrase('page')
      .phrase(test ? 'and a test suite are' : 'is')
      .phrase('created.')
      .build()
  );

/** Creates a `page` subcommand for the `create` command. */
exports.page = () =>
  new Command('page')
    .argument(
      '<name>',
      'Name of a new page. It will be served as a URL path also.'
    )
    .option('--test', 'Generates a test for the <name> page.', false)
    .description('Creates a new page that will be available with /<name> URL.')
    .action(async (pageName, {test}) => {
      const duration = Duration();

      await AssetsManager()
        .command(
          AssetCommandBuilder(AssetKind.Layout)
            .map(({content, target: [base, _layoutName]}) => ({
              content,
              target: [base, pageName + '.html.ejs']
            }))
            .build()
        )
        .command(
          AssetCommandBuilder(AssetKind.Section)
            .map(({content, target: [base, _page, sectionName]}) => {
              const sectionNameWithHash = uid() + '-' + sectionName;

              return {
                content: content
                  .replace('${page}', pageName)
                  .replace(
                    '${section}',
                    path.basename(
                      sectionNameWithHash,
                      path.extname(sectionNameWithHash)
                    )
                  ),
                target: [base, pageName, sectionNameWithHash]
              };
            })
            .build()
        )
        .commandIf(
          () => test,
          () =>
            AssetCommandBuilder(AssetKind.PageTest)
              .map(({content, target: [base, _page, testName]}) => ({
                content: content
                  .replace('${port}', Configuration.devServer.port)
                  .replace('${page}', pageName),
                target: [base, pageName, uid() + '-' + testName]
              }))
              .build()
        )
        .execute();

      successMessage(pageName, test)
        .line(StatusLine(duration.until(performance.now()).toDate()).build())
        .pipe(info);
    });
