import {fileURLToPath} from 'node:url';
import {join, basename, resolve, dirname} from 'node:path';
import {createReadStream, createWriteStream} from 'node:fs';

import Future from '@halo-lab/future';
import inquirer from 'inquirer';
import Iterable from '@halo-lab/iterable';
import {pipeWith} from 'pipe-ts';

import {Symbols} from '../../logger/symbols.js';
import {Duration} from '../../utils/date.js';
import {Typography} from '../../logger/colors.js';
import {CustomCommand} from '../../utils/custom-command.js';
import {Directory, File} from '../../files.js';
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

      const postdocRootDirectoryPath = join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        '..'
      );

      const {version} = await File(
        join(postdocRootDirectoryPath, 'package.json')
      )
        .map(JSON.parse)
        .content();

      const templateDirectory = Directory(
        join(postdocRootDirectoryPath, 'templates', 'default')
      );

      await pipeWith(
        templateDirectory.recursive(true).files(),
        Iterable.map(async (file) => {
          const outputAbsolutePath = file
            .source()
            .replace(templateDirectory.source(), workingDirectory);

          if (file.name() === 'package.json') {
            return file
              .map((content) =>
                content
                  .replace('${project_name}', workingDirectoryName)
                  .replace('${postdoc_version}', version)
                  .replace('${nightwatch_version}', nightwatchVersion)
                  .replace('${geckodriver_version}', geckodriverVersion)
              )
              .write(outputAbsolutePath);
          } else {
            const directory = Directory(dirname(outputAbsolutePath));

            if (!directory.exists()) {
              await directory.create();
            }

            return Future.from((ok, err) => {
              createReadStream(file.source())
                .pipe(createWriteStream(outputAbsolutePath))
                .on('error', err)
                .on('close', ok);
            });
          }
        }),
        Future.merge
      );

      successMessage(name, duration.untilNow().toDate()).pipe(info);
    });
