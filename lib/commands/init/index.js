/**
 * @file Defines the behaviour of the `init` command.
 */

import {cwd} from 'node:process';
import {fileURLToPath} from 'node:url';
import {join, basename, resolve, sep, dirname} from 'node:path';

import {Command} from 'commander';

import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Container} from '../../utils/container.js';
import {Typography} from '../../logger/colors.js';
import {Directory, File} from '../../files.js';
import {CONFIGURATION_ID} from '../../configuration/index.js';
import {getPackageVersion} from '../../npm-metadata.js';
import {defineMode, Mode} from '../../mode.js';
import {EJS_EXTENSION, LAYOUT_EXTENSION, MD_EXTENSION} from '../../constants.js';
import {AssetBuilder, AssetKind} from '../../assets/manager.js';
import {
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';
import {CustomCommand} from '../../utils/custom-command.js';
import inquirer from 'inquirer';
import {getProjectNameFromPackageJson} from '../../utils/init-tools.js';
import {createPage, createComponent, createCss, cpoyAsset} from '../../assets/manager.js';
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
        .text('Run:')
        .phrase(Typography().green('npm start'))
        .build()
    )
    .line('And then enjoy 😀')
    .line(StatusLine(duration).build());

/**
 * Initializes the project with PostDoc.
 * The command accepts the mandatory *name* value which is the name
 * of the project. The *name* may be the *.* character which means
 * that the folder of the project is a current working directory.
 *
 * The project folder needs to be empty to successfully generate files.
 */
export const init = () =>
  new CustomCommand('init')
    .description(
      'Generates a default project structure and necessary files to start with.'
    )
    .option('-n, --name <name>', 'A name of the project to generate.')
    .action(async (options) => {

      let name = options.name;
      const defaultValue = getProjectNameFromPackageJson();
      if (!name) {
        const inputName = await inquirer.prompt({
          type: 'input',
          name: 'name',
          message: 'Enter the name of the project:',
          default: defaultValue
        });

        name = inputName.name;
      }

      if (!name) {
        MessageBuilder().line(
          LineBuilder()
            .text(Typography().red(Symbols.Cross))
            .phrase('The')
            .phrase(Typography().bold('name'))
            .phrase('is required.')
            .build()
        )
          .line('Please try again.')
          .pipe(info);
 
        return;
      }

      const duration = Duration();

      defineMode(Mode.Bootstrapping);

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

      const [nightwatchVersion, geckodriverVersion] = await Promise.all([
        getPackageVersion('nightwatch').catch(() => '2.6.19'),
        getPackageVersion('geckodriver').catch(() => '3.2.0')
      ]);

      if (!File(packageDefinitionAsset.destination).exists()) {
        const {version} = await File(join(
          dirname(fileURLToPath(import.meta.url)),
          '..',
          '..',
          '..',
          'package.json'
        ))
          .map(JSON.parse)
          .content();

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
          destination: [pagesDirectory.source(), 'index' + LAYOUT_EXTENSION]
        }))
        .build();

      if (!File(layoutAsset.destination).exists()) {
        await File(layoutAsset.source).write(layoutAsset.destination);
      }

      const contentAsset = AssetBuilder(AssetKind.Page)
        .map(({source}) => ({
          source,
          destination: [pagesDirectory.source(), 'index' + MD_EXTENSION]
        }))
        .build();

      if (!File(contentAsset.destination).exists()) {
        await File(contentAsset.source)
          .map((content) => content.replace('${page}', 'home'))
          .write(contentAsset.destination);
      }

      const directoriesToCreate = [
        join(workingDirectory, 'public'),
        join(workingDirectory, 'public', 'css'),
        join(workingDirectory, 'pages', 'homepage'),
        join(workingDirectory, 'pages', 'guide'),
        join(workingDirectory, 'pages', 'guide', 'installation'),
        join(workingDirectory, 'pages', 'guide', 'concepts'),
        join(workingDirectory, 'pages', 'guide', 'usage'),
        join(workingDirectory, 'pages', 'api_reference'),
        join(workingDirectory, 'pages', 'api_reference', 'configuration'),
        join(workingDirectory, 'pages', 'api_reference', 'docs'),
        join(workingDirectory, 'pages', 'about'),
        join(workingDirectory, 'includes'),
        join(workingDirectory, 'public', 'assets')
      ];
      for (const directory of directoriesToCreate) {
        await Directory(directory).create();
      }

      const pages = [
        {name: 'homepage', path: join(workingDirectory, 'pages', 'homepage', 'index.ejs')},
        {name: 'api_reference', path: join(workingDirectory, 'pages', 'api_reference', 'index.ejs')},
        {name: 'about', path: join(workingDirectory, 'pages', 'about', 'index.ejs')},
        {name: 'installation', path: join(workingDirectory,  'pages', 'guide', 'installation',  'index.ejs'), data: {page: {content: 'This is the installation page'}}},
        {name: 'usage', path: join(workingDirectory,  'pages', 'guide', 'usage',  'index.ejs'), data: {page: {content: 'This is the usage page'}}},
        {name: 'configuration', path: join(workingDirectory,  'pages', 'api_reference', 'configuration',  'index.ejs'), data: {page: {content: 'This is the configuration page'}}},
        {name: 'docs', path: join(workingDirectory,  'pages', 'api_reference', 'docs',  'index.ejs'), data: {page: {content: 'This is the docs page'}}},
        {name: 'concepts', path: join(workingDirectory,  'pages', 'guide', 'concepts',  'index.ejs'), data: {page: {content: 'This is the concepts page'}}},
        {name: 'what_is_project', path: join(workingDirectory, 'pages', 'guide', 'index.ejs'), data: {page: {content: 'This is the what_is_project page'}}}
      ];
      
      const components = [
        {name: 'header', path: join(workingDirectory, 'includes', 'header.ejs')},
        {name: 'left_side_menu', path: join(workingDirectory, 'includes', 'left_side_menu.ejs')},
        {name: 'left_api_menu', path: join(workingDirectory, 'includes', 'left_api_menu.ejs')},
        {name: 'footer', path: join(workingDirectory, 'includes', 'footer.ejs')}
      ];

      const assets = [
        {name: 'homepage_background', path: join(workingDirectory, 'assets', 'homepage_background.jpg'), ref: 'background.png'},
        {name: 'project_image', path: join(workingDirectory, 'assets', 'project_image.jpg'), ref: 'project_image.png'}
      ];

      const cssFiles = [
        'homepage',
        'guide',
        'api_reference',
        'about',
        'header',
        'footer'
      ];

      for (const component of components) {
        await createComponent(component.name, component.path, component.data || {page: {}})();
      }
      for (const page of pages) {
        await createPage(page.name, page.path)();
      }
      for (const cssFile of cssFiles) {
        const outputPath = join(workingDirectory, 'public', 'css', `${cssFile}.css`);
        await createCss(cssFile, outputPath)();
      }

      for (const asset of assets) {
        const outputPath = join(workingDirectory, 'public', 'assets', `${asset.name}.jpg`);
        await cpoyAsset(asset.ref, outputPath)();
      }

      
      const robotsAsset = AssetBuilder(AssetKind.Robots)
        .map(({source, destination: [_base, name]}) => ({
          source,
          destination: [
            configuration.directories.public.replace(cwd(), workingDirectory),
            name
          ]
        }))
        .build();

      if (!File(robotsAsset.destination).exists()) {
        await File(robotsAsset.source).write(robotsAsset.destination);
      }

      successMessage(name, duration.untilNow().toDate()).pipe(info);
    });
