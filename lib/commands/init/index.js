import {cwd} from 'node:process';
import {copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join, basename, resolve, sep, dirname} from 'node:path';

import Future from '@halo-lab/future';
import inquirer from 'inquirer';

import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Container} from '../../utils/container.js';
import {Typography} from '../../logger/colors.js';
import {resolveAsset} from '../../assets/manager.js';
import {CustomCommand} from '../../utils/custom-command.js';
import {Directory, File} from '../../files.js';
import {LAYOUT_EXTENSION} from '../../constants.js';
import {CONFIGURATION_ID} from '../../configuration/index.js';
import {defineMode, Mode} from '../../mode.js';
import {getPackageVersion} from '../../npm-metadata.js';
import {getProjectNameFromPackageJson} from '../../utils/init-tools.js';
import {
  info,
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder
} from '../../logger/index.js';

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
      () =>
        LineBuilder()
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
 *
 * @since 0.1.0
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
        MessageBuilder()
          .line(
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
      const workingDirectoryName =
        name === '.' ? basename(workingDirectory) : name;

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

      const [nightwatchVersion, geckodriverVersion] = await Future.merge(
        getPackageVersion('nightwatch').catch(() => '3.0.0'),
        getPackageVersion('geckodriver').catch(() => '4.0.0')
      );

      const {version} = await File(
        join(
          dirname(fileURLToPath(import.meta.url)),
          '..',
          '..',
          '..',
          'package.json'
        )
      )
        .map(JSON.parse)
        .content();

      await File(resolveAsset('files', 'package.json'))
        .map((content) => content.replace('${name}', workingDirectoryName))
        .map((content) => content.replace('${version}', version))
        .map((content) =>
          content.replace('${nightwatch_version}', nightwatchVersion)
        )
        .map((content) =>
          content.replace('${geckodriver_version}', geckodriverVersion)
        )
        .write(join(workingDirectory, 'package.json'));

      const pagesDirectory = await Directory(
        join(
          workingDirectory,
          configuration.directories.pages.replace(cwd() + sep, '')
        )
      ).create();

      const includesDirectory = Directory(
        configuration.directories.includes.replace(cwd(), workingDirectory)
      );

      await File(resolveAsset('files', 'layout.ejs')).write(
        join(pagesDirectory.source(), 'index' + LAYOUT_EXTENSION)
      );

      const pages = [
        {name: 'homepage', path: join(pagesDirectory.source(), 'index.ejs')},
        {
          name: 'api_reference',
          path: join(pagesDirectory.source(), 'api_reference', 'index.ejs')
        },
        {
          name: 'about',
          path: join(pagesDirectory.source(), 'about', 'index.ejs')
        },
        {
          name: 'installation',
          path: join(
            pagesDirectory.source(),
            'guide',
            'installation',
            'index.ejs'
          )
        },
        {
          name: 'usage',
          path: join(pagesDirectory.source(), 'guide', 'usage', 'index.ejs')
        },
        {
          name: 'configuration',
          path: join(
            pagesDirectory.source(),
            'api_reference',
            'configuration',
            'index.ejs'
          )
        },
        {
          name: 'docs',
          path: join(
            pagesDirectory.source(),
            'api_reference',
            'docs',
            'index.ejs'
          )
        },
        {
          name: 'concepts',
          path: join(pagesDirectory.source(), 'guide', 'concepts', 'index.ejs')
        },
        {
          name: 'what_is_project',
          path: join(pagesDirectory.source(), 'guide', 'index.ejs')
        }
      ];

      const components = [
        {
          name: 'header',
          path: join(includesDirectory.source(), 'header.ejs')
        },
        {
          name: 'left_side_menu',
          path: join(includesDirectory.source(), 'left_side_menu.ejs')
        },
        {
          name: 'left_api_menu',
          path: join(includesDirectory.source(), 'left_api_menu.ejs')
        },
        {
          name: 'mobile_sidesmenu_header',
          path: join(includesDirectory.source(), 'mobile_sidesmenu_header.ejs')
        },
        {
          name: 'footer',
          path: join(includesDirectory.source(), 'footer.ejs')
        }
      ];

      const assets = [
        {
          name: 'background.png',
          path: join(workingDirectory, 'assets', 'homepage_background.jpg')
        },
        {
          name: 'project_image.png',
          path: join(workingDirectory, 'assets', 'project_image.jpg')
        },
        {
          name: 'code_icon.svg',
          path: join(workingDirectory, 'assets', 'code_icon.svg')
        },
        {
          name: 'facebook_light.svg',
          path: join(workingDirectory, 'assets', 'facebook_light.svg')
        },
        {
          name: 'facebook.svg',
          path: join(workingDirectory, 'assets', 'facebook.svg')
        },
        {
          name: 'github_light.svg',
          path: join(workingDirectory, 'assets', 'github_light.svg')
        },
        {
          name: 'github.svg',
          path: join(workingDirectory, 'assets', 'github.svg')
        },
        {
          name: 'instagram_light.svg',
          path: join(workingDirectory, 'assets', 'instagram_light.svg')
        },
        {
          name: 'instagram.svg',
          path: join(workingDirectory, 'assets', 'instagram.svg')
        },
        {
          name: 'light_icon.svg',
          path: join(workingDirectory, 'assets', 'light_icon.svg')
        },
        {
          name: 'lightbulb_icon.svg',
          path: join(workingDirectory, 'assets', 'lightbulb_icon.svg')
        },
        {
          name: 'logo_light.svg',
          path: join(workingDirectory, 'assets', 'logo_light.svg')
        },
        {
          name: 'logo.svg',
          path: join(workingDirectory, 'assets', 'logo.svg')
        },
        {
          name: 'moon.svg',
          path: join(workingDirectory, 'assets', 'moon.svg')
        },
        {
          name: 'search_icon_light.svg',
          path: join(workingDirectory, 'assets', 'search_icon_light.svg')
        },
        {
          name: 'search_icon.svg',
          path: join(workingDirectory, 'assets', 'search_icon.svg')
        },
        {name: 'sun.svg', path: join(workingDirectory, 'assets', 'sun.svg')},
        {
          name: 'twitter_light.svg',
          path: join(workingDirectory, 'assets', 'twitter_light.svg')
        },
        {
          name: 'twitter.svg',
          path: join(workingDirectory, 'assets', 'twitter.svg')
        }
      ];

      const cssFiles = [
        'homepage',
        'guide',
        'api_reference',
        'about',
        'header',
        'footer',
        'base'
      ];

      const jsFiles = ['header', 'base', 'toggleSideMenu'];

      for (const {name, path} of components) {
        await File(resolveAsset('files', `${name}.ejs`)).write(path);
      }

      for (const {name, path} of pages) {
        await File(resolveAsset('files', `${name}.ejs`)).write(path);
      }

      for (const cssFile of cssFiles) {
        const fileName = `${cssFile}.css`;

        await File(resolveAsset('styles', fileName)).write(
          join(workingDirectory, 'css', fileName)
        );
      }

      for (const jsFile of jsFiles) {
        const fileName = `${jsFile}.js`;

        await File(resolveAsset('scripts', fileName)).write(
          join(workingDirectory, 'js', fileName)
        );
      }

      for (const {name, path} of assets) {
        await Directory(dirname(path)).create();

        await copyFile(resolveAsset('images', name), path);
      }

      await File(resolveAsset('files', 'robots.txt')).write(
        join(
          configuration.directories.public.replace(cwd(), workingDirectory),
          'robots.txt'
        )
      );

      successMessage(name, duration.untilNow().toDate()).pipe(info);
    });
