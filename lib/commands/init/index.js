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
import {createHomepage, createGuide, createAbout, createAPIReference, createCss, createFooter, createHeader} from '../../assets/manager.js';
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
      const directories = [
        'public',
        'public/css',
        'pages/homepage',
        'includes'
      ];
    
      const pagesData = {
        homepage: {template: 'index.ejs', generator: createHomepage, data: {page: {content: 'This is the homepage'}}, path: 'pages/homepage'},
        header: {template: 'header.ejs', generator: createHeader, data: {page: {}}, path: 'includes'},
        guide: {template: 'guide.ejs', generator: createGuide, data: {page: {}}, path: 'includes'},
        apiReference: {template: 'api_reference.ejs', generator: createAPIReference, data: {page: {}}, path: 'includes'},
        about: {template: 'about.ejs', generator: createAbout, data: {page: {content: 'This is the about page'}}, path: 'includes'},
        footer: {template: 'footer.ejs', generator: createFooter, data: {page: {}}, path: 'includes'}
      };
    
      const cssFiles = [
        'homepage.css',
        'guide.css',
        'api_reference.css',
        'about.css',
        'header.css',
        'footer.css'
      ];
    

      await Promise.all(directories.map(dir => Directory(join(workingDirectory, dir)).create()));
    

      const pages = Object.keys(pagesData).map(pageKey => {
        const page = pagesData[pageKey];
        const outputPath = join(workingDirectory, page.path, page.template);

        return page.generator(outputPath, page.data);
      });
      await Promise.all(pages.map(async page => await page.generate()));
    

      const cssPromises = cssFiles.map(file => {
        const outputPath = join(workingDirectory, 'public', 'css', file);
        const css = createCss(file, outputPath);

        return css.generate();
      });
      await Promise.all(cssPromises);
    
    
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
