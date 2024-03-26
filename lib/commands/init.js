/**
 * Initializes the project with PostDoc.
 * The command accepts the *name* option which is the name
 * of the project and the target directory for it.
 * The *name* may be the *.* character which means that the folder
 * of the project is a current working directory.
 *
 * > The project folder needs to be empty to successfully generate files.
 *
 * @example
 * npx postdoc init
 * @example
 * npx postdoc init --name my-blog
 *
 * > We use `npx` in the examples above to use the `postdoc` binary directly
 * > from the npm, but you can install the CLI globally `npm i -g postdoc`
 * > and omit the `npx` command. We recommend not global install though.
 *
 * Also, you can use the `npm create postdoc` command to bootstrap a new project.
 * It works the same as using directly `postdoc` binary, except that
 * the `--name` option should be provided after the double-dash `--`.
 *
 * @example
 * npm create postdoc -- --name my-blog
 *
 * @name init
 * @since 0.1.0
 */

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { writeFileSync, createReadStream, createWriteStream, existsSync } from 'node:fs';

import inquirer from 'inquirer';
import AsyncIterable from '@halo-lab/iterable/async';

import Logger from '../logger.js';
import PostDocCommand from '../command.js';
import getPackageVersion from '../npm-metadata.js';
import runAndMeasureAction from './measured-action.js';
import { walkDirectory } from '../fs.js';
import chalk from 'chalk';
import SphinxCompiler from '../sphinx/sphinx-compiler.js';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function ensurePackageNameDefined(name) {
  if (!name) {
    const inputName = await inquirer.prompt({
      type: 'input',
      name: 'name',
      message: 'Enter the name of the project:'
    });

    name = inputName.name;
  }

  if (!name) {
    Logger.log(
      (typography) => `
				The ${typography.bold('name')} is required.
					Please try again.
			`,
      Logger.ErrorLevel
    );

    return;
  }

  return name;
}

export default function createInitCommand() {
  return new PostDocCommand('init')
    .description(
      'Initializes a new Postdoc project and copies the necessary assets to start with.'
    )
    .option('-n, --name <name>', 'The name of the new project to create.')
    .option('-t, --template <template>', 'The UI template to use for the new project.')
    .action((options) =>
      runAndMeasureAction(async () => {
        showInfoBanner();

        const name = await ensurePackageNameDefined(options.name);

        if (!name) {
          // A message was printed, so we can just finish execution here.
          return;
        }

        const targetDirectoryPath = resolve(name);

        const targetDirectoryName = basename(targetDirectoryPath);

        if (name === '.') {
          const directoryDescriptor = walkDirectory(targetDirectoryPath);

          if (!(await AsyncIterable.isEmpty(directoryDescriptor.files))) {
            Logger.log(
              (typography) => `
                The ${typography.bold(
                targetDirectoryName
              )} directory is not empty.
                Please specify an empty folder.
               `
            );

            return;
          }
        } else {
          const existsDirectory = existsSync(targetDirectoryPath);

          if (existsDirectory) {
            Logger.log(
              (typography) => `
                  The ${typography.bold(
                targetDirectoryName
              )} directory already exists.
                  Please specify an empty folder or use a different name.
                 `
            );

            return;
          }

          await mkdir(targetDirectoryPath, { recursive: true });
        }

        const [nightwatchVersion, nightwatchPluginPostdocVersion] = await Promise.all([
          getPackageVersion('nightwatch').catch(
            () => '3.0.0'
          ),
          getPackageVersion('nightwatch-plugin-postdoc').catch(
            () => '0.1.0'
          )
        ]);

        const postDocPackageDefinition = require('../../package.json');

        const template = await selectTemplate();

        let sphinx_docs_path = ''
        if (template == "sphinx-python") {
          sphinx_docs_path = await sphinxDocsBuild(name);

          if (existsSync(sphinx_docs_path)) {

            Logger.log(() => "Compiling sphinx xml output...");

            const sphinxCompiler = new SphinxCompiler();
            await sphinxCompiler.compile(sphinx_docs_path, `./${name}`);
        
            Logger.log(() => "Compiling done!");

          } else {
            Logger.log(() => "Path provided doesn't exist.");
            return;
          }
        }

        const defaultTemplateDirectoryPath = join(
          __dirname,
          '..',
          '..',
          'extra',
          'templates',
          template
        );

        const defaultTemplateDirectoryDescriptor = walkDirectory(
          defaultTemplateDirectoryPath
        );

        await AsyncIterable.forEach(
          defaultTemplateDirectoryDescriptor.files,
          async (filePath) => {
            const outputAbsolutePath = filePath.replace(
              defaultTemplateDirectoryPath,
              targetDirectoryPath
            );

            const directoryPath = dirname(outputAbsolutePath);
            const existsDirectory = existsSync(directoryPath);

            if (!existsDirectory) {
              await mkdir(directoryPath, { recursive: true });
            }

            if (
              basename(filePath) === 'package.json' ||
              basename(filePath) === 'globals.cjs' ||
              basename(filePath) === 'postdoc.config.js'
            ) {
              const fileContent = await readFile(filePath, 'utf8');

              const finalContent = fileContent
                .replace('${project_name}', targetDirectoryName)
                .replace('${postdoc_version}', postDocPackageDefinition.version)
                .replace('${sphinx_docs_path}', sphinx_docs_path)
                .replace('${nightwatch_version}', nightwatchVersion)
                .replace('${nightwatch_plugin_postdoc_version}', nightwatchPluginPostdocVersion);

              await writeFile(outputAbsolutePath, finalContent);
            } else {
              return new Promise((resolve, reject) => {
                createReadStream(filePath)
                  .pipe(createWriteStream(outputAbsolutePath))
                  .on('error', reject)
                  .on('close', resolve);
              });
            }
          }
        );

        Logger.log(
          (typography) => `
            The ${name} Postdoc project is ready with example pages and assets. To get started, run:
            
            ${name === '.' ? '' : `${typography.green('cd')} ${typography.green.bold(name)}`}
            ${typography.green('npm start')}
            
          `,
          Logger.SuccessLevel
        );
      })
    );
}

async function selectTemplate() {
  const answers = await inquirer.prompt({
    type: 'list',
    name: 'template',
    message: 'Select the UI template to used:',
    choices: ['default', 'sphinx-python'],
    default: 'default'
  });

  return answers.template;
}

async function sphinxDocsBuild() {
  const inputName = await inquirer.prompt({
    type: 'input',
    name: 'sphinxDocs',
    message: 'Enter path to python sphinx docs:'
  });

  return inputName.sphinxDocs;
}


function showInfoBanner() {
  const bannerLines = [
    chalk.gray('\n ---------------------------------------------------'),
    `${chalk.white(' 📄 Welcome to')} ${chalk.bold.white('Postdoc')} ${chalk.white('setup 🚀')}`,
    chalk.gray(' ---------------------------------------------------'),
    '',
    `${chalk.white(' We\'ll get your new website ready for you in no-time.')} `,
    '',
  ];

  console.log(bannerLines.join('\n'));
}