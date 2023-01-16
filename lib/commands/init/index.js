/**
 * @file Defines the behaviour of the `init` command.
 */

const {cwd} = require('process');
const {join, basename, resolve, sep} = require('path');

const {Command} = require('commander');

const {version} = require('../../../package.json');
const {Symbols} = require('../../logger/Symbols.js');
const {Duration} = require('../../utils/date.js');
const {Container} = require('../../utils/container.js');
const {Typography} = require('../../logger/colors.js');
const {Directory, File} = require('../../files.js');
const {CONFIGURATION_ID} = require('../../configuration/index.js');
const {getPackageVersion} = require('../../npm-metadata.js');
const {AssetBuilder, AssetKind} = require('../../assets/manager.js');
const {LAYOUT_SUFFIX, MD_SUFFIX} = require('../../constants.js');
const {
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} = require('../../logger/index.js');

/**
 * @param {string} name
 * @param {Date} duration
 */
const successMessage = (name, duration) =>
  MessageBuilder()
    .line(
      LineBuilder()
        .text(Typography().green(Symbols.Check))
        .phrase('The project is generated.')
        .build()
    )
    .line(Separator.Empty)
    .lineIf(
      () => name !== '.',
      () => LineBuilder()
        .text('Navigate to it with:')
        .phrase(Typography().green('cd'))
        .phrase(Typography().green.bold(name))
        .build()
    )
    .line(
      LineBuilder()
        .text('To start development run:')
        .phrase(Typography().green('npm start'))
        .build()
    )
    .line(StatusLine(duration).build());

/**
 * Initializes the project with PostDoc.
 * The command accepts the mandatory *name* value which is the name
 * of the project. The *name* may be the *.* character which means
 * that the folder of the project is a current working directory.
 *
 * The project folder needs to be empty to successfully generate files.
 */
exports.init = () =>
  new Command('init')
    .argument('<name>', 'A name of the project to generate.')
    .description(
      'Generates a default project structure and necessary files to start with.'
    )
    .action(async (name) => {
      const duration = Duration();

      const configuration = Container.get(CONFIGURATION_ID);

      const workingDirectory = resolve(name);
      const workingDirectoryName = name === '.' ? basename(workingDirectory) : name;

      const directory = Directory(workingDirectory);

      if (name !== '.') {
        await directory.create();
      }

      if (directory.files().length > 0) {
        MessageBuilder()
          .line(
            LineBuilder()
              .text(Typography().red(Symbols.Cross))
              .phrase('The')
              .phrase(Typography().bold(workingDirectoryName))
              .phrase('directory is not empty.')
              .build()
          )
          .line('Please empty the folder and try again.')
          .line(StatusLine(duration.untilNow().toDate()).build())
          .pipe(info);

        return;
      }

      const packageDefinitionAsset = AssetBuilder(AssetKind.PackageDefinition)
        .map(({source, destination: [_base, name]}) => ({
          source,
          destination: [workingDirectory, name]
        }))
        .build();

      const nightwatchVersion = await getPackageVersion('nightwatch').catch(() => '2.4.1');
      const geckodriverVersion = await getPackageVersion('geckodriver').catch(() => '3.2.0');

      if (!File(packageDefinitionAsset.destination).exists()) {
        await File(packageDefinitionAsset.source)
          .map((content) => content.replace('${name}', workingDirectoryName))
          .map((content) => content.replace('${version}', version))
          .map((content) => content.replace('${nightwatch_version}', nightwatchVersion))
          .map((content) => content.replace('${geckodriver_version}', geckodriverVersion))
          .write(packageDefinitionAsset.destination);
      }

      const pagesDirectory = await Directory(
        join(workingDirectory, configuration.directories.pages.replace(cwd() + sep, ''))
      ).create();

      const layoutAsset = AssetBuilder(AssetKind.Layout)
        .map(({source}) => ({
          source,
          destination: [pagesDirectory.source(), 'index' + LAYOUT_SUFFIX]
        }))
        .build();

      if (!File(layoutAsset.destination).exists()) {
        await File(layoutAsset.source).write(layoutAsset.destination);
      }

      const contentAsset = AssetBuilder(AssetKind.Page)
        .map(({source}) => ({
          source,
          destination: [pagesDirectory.source(), 'index' + MD_SUFFIX]
        }))
        .build();

      if (!File(contentAsset.destination).exists()) {
        await File(contentAsset.source)
          .map((content) => content.replace('${page}', 'home'))
          .write(contentAsset.destination);
      }

      successMessage(name, duration.untilNow().toDate()).pipe(info);
    });
