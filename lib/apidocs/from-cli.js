import {inspect} from 'node:util';
import {readFile} from 'node:fs/promises';
import {cwd, env} from 'node:process';
import {existsSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

import pty from 'node-pty';
import Future from '@halo-lab/future';
import inquirer from 'inquirer';
import Iterable from '@halo-lab/iterable';
import Optional from '@halo-lab/optional';
import {pipe, pipeWith} from 'pipe-ts';

import {info} from '../logger/index.js';
import {EJS_EXTENSION} from '../constants.js';
import {Directory, File} from '../files.js';
import {parseCommanderOutput} from './from-cli-commander.js';

const stripAnsiColorCodes = (input) => input.replace(/\u001b\[.*?m/g, ''); // eslint-disable-line no-control-regex

const detectPathToCliType = (relativePathToCliOrExecutableCommand) => {
  if (
    (relativePathToCliOrExecutableCommand.startsWith('npm ') ||
      relativePathToCliOrExecutableCommand.startsWith('npx ')) &&
    relativePathToCliOrExecutableCommand.includes('--help')
  ) {
    return {
      kind: 'command',
      value: relativePathToCliOrExecutableCommand.split(/\s+/).concat('--')
    };
  } else {
    return {
      kind: 'path',
      value: ['node', relativePathToCliOrExecutableCommand, '--help']
    };
  }
};

const getParserForPackage = (packageName) => {
  switch (packageName) {
    case SUPPORTED_CLI_PACKAGES.Oclif:
      return console.log; // eslint-disable-line no-console
    case SUPPORTED_CLI_PACKAGES.Commander:
      return parseCommanderOutput;
    default:
      throw new Error(`Unknown CLI package detected: ${packageName}`);
  }
};

const incorporateCommandInto = (cliArguments, commandName) => {
  // Just makes a copy to avoid polluting original value.
  cliArguments = cliArguments.slice();

  const lastArgument = cliArguments.pop();

  cliArguments.push(commandName, lastArgument);

  return cliArguments;
};

const obtainCommandOutput = ([executableName, ...executableArguments]) =>
  Future.from((ok, err) => {
    // Spawn a shell using node-pty
    const shell = pty.spawn(executableName, executableArguments, {
      name: 'xterm-color',
      cols: 200,
      rows: 30,
      cwd: cwd(),
      env
    });

    let cliOutput = '';

    shell.on('data', (data) => {
      cliOutput += data;
    });

    shell.on('exit', ({exitCode}) => {
      const strippedOutput = stripAnsiColorCodes(cliOutput);

      exitCode ? err(strippedOutput) : ok(strippedOutput);
    });
  });

const deepInspect = (value) => inspect(value, true, Infinity, true);

const collectCommand = (cliArgument, parseOutput) =>
  pipeWith(
    obtainCommandOutput(cliArgument),
    Future.apply(parseOutput),
    Future.map(Optional.map((output) => output.result)),
    Future.map(
      Optional.map((result) => {
        const commands = pipeWith(
          result.commands,
          Optional.transpose(Iterable.of),
          Iterable.map(Optional.map(({name}) => name)),
          Iterable.map(
            Optional.map((commandName) =>
              incorporateCommandInto(cliArgument, commandName)
            )
          ),
          Iterable.map(
            Optional.map((nextCliArgument) =>
              collectCommand(nextCliArgument, parseOutput)
            )
          ),
          Iterable.filter(Optional.isSome)
        );

        return Future.merge(result, ...commands);
      })
    ),
    Future.map(
      Optional.map(([parentCommand, ...childCommands]) => ({
        name: parentCommand.usage.name,
        options: parentCommand.options,
        children: childCommands,
        argument: parentCommand.usage.argument,
        signature: parentCommand.usage.signature,
        description: parentCommand.usage.description
      }))
    )
  );

const commandOutputHTML = (command) => {
  const options = command.options?.map(
    (option) => `
      <li><em>${option.name} ${
  option.shortSymbol ? `| ${option.shortSymbol}` : ''
}</em>${option.description ?? ''}</li>
    `
  );

  const subcommands = command.children.map(
    (command) => `
      <li>
        <em>${command.name}</em> ${command.description ?? ''}
      </li>
    `
  );

  const argument = command.argument
    ? `
    <h3>Argument</h3>
    <p><em>${command.argument.name}</em> ${
  command.argument.description ?? ''
}</p>
  `
    : '';

  return `
  <h1>${command.name}</h1>
  <h2>Usage</h2>
  <pre><code>${command.signature}</code></pre>
  ${command.description ? `<p>${command.description}</p>` : ''}
  ${argument}
  ${options ? `<h2>Options</h2><ul>${options}</ul>` : ''}
  ${subcommands.length ? `<h2>Subcommands</h2><ul>${subcommands}</ul>` : ''}
`;
};

const createPagesGenerator =
  (configuration) =>
    async (command, parentNames = []) => {
      const outputFile = resolve(
        configuration.directories.pages,
        configuration.apidocs.outputDirectory,
        ...parentNames,
        command.name,
        `index${EJS_EXTENSION}`
      );

      const containerDirectory = Directory(dirname(outputFile));

      if (!containerDirectory.exists()) {
        await containerDirectory.create();
      }

      const html = commandOutputHTML(command);

      await File()
        .map(() => html)
        .write(outputFile);

      return Future.merge(
        command.children.map((child) =>
          createPagesGenerator(configuration)(
            child,
            parentNames.concat(command.name)
          )
        )
      );
    };

export const generateCliApiPages = (
  configuration,
  relativePathToCli,
  stdout
) => {
  const {value} = detectPathToCliType(relativePathToCli);

  const parseOutput = pipeWith(
    detectInstalledCliPackage(),
    Future.map(getParserForPackage)
  );

  return pipeWith(
    collectCommand(value, parseOutput),
    Future.map((output) =>
      stdout ? info(deepInspect(output)) : output
    ),
    Future.map(Optional.map(createPagesGenerator(configuration)))
  );
};

const SUPPORTED_CLI_PACKAGES = {
  Commander: 'commander',
  Oclif: 'oclif'
};

const askUserSupportedPackage = pipe(
  () =>
    inquirer.prompt([
      {
        type: 'list',
        name: 'supportedPackage',
        message: 'Which CLI package do you use in your application?',
        choices: [
          SUPPORTED_CLI_PACKAGES.Commander,
          SUPPORTED_CLI_PACKAGES.Oclif,
          'none'
        ]
      }
    ]),
  Future.map((answers) =>
    answers.supportedPackage === 'none'
      ? Optional.Default
      : answers.supportedPackage
  )
);

const detectInstalledCliPackage = () => {
  const packageJsonPath = resolve('package.json');

  if (existsSync(packageJsonPath)) {
    return pipeWith(
      readFile(packageJsonPath, {encoding: 'utf8'}),
      Future.map(JSON.parse),
      Future.map((json) =>
        Object.assign({}, json.dependencies ?? {}, json.devDependencies ?? {})
      ),
      Future.map(Object.keys),
      Future.map(
        Iterable.map((packageName) => {
          if (packageName === SUPPORTED_CLI_PACKAGES.Commander) {
            return SUPPORTED_CLI_PACKAGES.Commander;
          } else if (
            packageName === SUPPORTED_CLI_PACKAGES.Oclif ||
            packageName.includes(SUPPORTED_CLI_PACKAGES.Oclif)
          ) {
            return SUPPORTED_CLI_PACKAGES.Oclif;
          } else {
            return packageName;
          }
        })
      ),
      Future.map(
        Iterable.find(
          (packageName) =>
            packageName === SUPPORTED_CLI_PACKAGES.Commander ||
            packageName === SUPPORTED_CLI_PACKAGES.Oclif
        )
      ),
      Future.map(Optional.orElse(askUserSupportedPackage))
    );
  } else {
    return askUserSupportedPackage();
  }
};
