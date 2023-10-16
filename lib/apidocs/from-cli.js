import {inspect} from 'node:util';
import {cwd, env} from 'node:process';
import {readFile, stat} from 'node:fs/promises';
import {sep, dirname, resolve} from 'node:path';

import pty from 'node-pty';
import Future from '@halo-lab/future';
import Iterable from '@halo-lab/iterable';
import Optional from '@halo-lab/optional';
import {pipe, pipeWith} from 'pipe-ts';

import {error, info} from '../logger/index.js';
import {EJS_EXTENSION} from '../constants.js';
import {Directory, File} from '../files.js';
import {parseCommanderOutput} from './from-cli-commander.js';

const stripAnsiColorCodes = (input) => input.replace(/\u001b\[.*?m/g, ''); // eslint-disable-line no-control-regex

const getParserForPackage = (packageName) => {
  switch (packageName) {
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
  const options = command.options
    ?.map(
      (option) => `
      <li><em>${option.name} ${
  option.shortSymbol ? `| ${option.shortSymbol}` : ''
}</em> ${option.description ?? ''}</li>
    `
    )
    .join('\n');

  const subcommands = command.children
    .map(
      (command) => `
      <li>
        <em>${command.name}</em> ${command.description ?? ''}
      </li>
    `
    )
    .join('\n');

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
  (configuration, outputDirectory) =>
    async (command, parentNames = []) => {
      const outputFile = resolve(
        outputDirectory,
        configuration.directories.pages.replace(cwd() + sep, ''),
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
          createPagesGenerator(configuration, outputDirectory)(
            child,
            parentNames.concat(command.name)
          )
        )
      );
    };

const readPackageJson = pipe(
  (atDirectory) => resolve(atDirectory, 'package.json'),
  (path) =>
    pipeWith(
      path,
      stat,
      Future.map(Optional.filter((stat) => stat.isFile())),
      Future.map(Optional.map(() => path))
    ),
  Future.map(Optional.map((path) => readFile(path, 'utf8'))),
  Future.map(Optional.map(JSON.parse))
);

export const generateCliApiPages = async (
  configuration,
  outputDirectory,
  stdout
) => {
  const packageJson = await readPackageJson(cwd());

  if (!packageJson) {
    error(
      'Cannot generate API pages from a project without a package.json file.'
    );

    return;
  }

  if (!packageJson.bin) {
    error('The current package is not CLI. No pages were generated.');

    return;
  }

  const hasCommanderDependency = pipeWith(
    Iterable.from(function* () {
      if ('dependencies' in packageJson) {
        for (const key in packageJson.dependencies) {
          yield key;
        }
      }
    }),
    Iterable.concat(
      Iterable.from(function* () {
        if ('devDependencies' in packageJson) {
          for (const key in packageJson.devDependencies) {
            yield key;
          }
        }
      })
    ),
    Iterable.unique(),
    Iterable.any((key) => key === SUPPORTED_CLI_PACKAGES.Commander)
  );

  if (!hasCommanderDependency) {
    error(
      `Cannot generate API pages because only ${SUPPORTED_CLI_PACKAGES.Commander} is supported, but it isn't listed in dependency lists.`
    );

    return;
  }

  const parseOutput = getParserForPackage(SUPPORTED_CLI_PACKAGES.Commander);

  const executable =
    typeof packageJson.bin === 'string'
      ? packageJson.bin
      : Object.values(packageJson.bin).at(0);

  if (!executable) {
    error(
      `Cannot genereta API pages because there is no binary found for the "${packageJson.name}" package.`
    );

    return;
  }

  return pipeWith(
    collectCommand(['node', executable, '--help'], parseOutput),
    Future.map((output) => (stdout ? info(deepInspect(output)) : output)),
    Future.map(
      Optional.map(createPagesGenerator(configuration, outputDirectory))
    )
  );
};

const SUPPORTED_CLI_PACKAGES = {
  Commander: 'commander',
};
