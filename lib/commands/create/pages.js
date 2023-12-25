/**
 * This command generates MD pages and test suites for them.
 * By providing a list of new pages URLs that you want to create,
 * PostDoc will generate MD files with basic content. For each page,
 * the [page object](https://nightwatchjs.org/guide/using-page-objects/getting-started.html)
 * with a basic test file that uses it will be generated.
 *
 * @example
 * npx postdoc create pages /feature-page.html /community-support.html /forum/index.html
 *
 * If you have a CLI tool for which the documentation should be generated,
 * and it is implemented by using [commander](https://www.npmjs.com/package/commander)
 * you can provide the `--from-cli <path-to-package>` option. In that case, URLs
 * are ignored.
 *
 * @example
 * npx postdoc create pages --from-cli ../my-package
 *
 * Path should point to the root of the package.
 *
 * @name pages
 * @since 0.1.0
 */

import { spawn } from 'node:child_process';
import { inspect } from 'node:util';
import { cwd, env } from 'node:process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, basename, extname, join, resolve, sep } from 'node:path';

import Iterable from '@halo-lab/iterable';
import { pipeWith } from 'pipe-ts';
import {
  str,
  char,
  skip,
  many,
  many1,
  mapTo,
  regex,
  letter,
  choice,
  between,
  possibly,
  endOfInput,
  sequenceOf,
  whitespace,
  pipeParsers,
  everyCharUntil,
  optionalWhitespace
} from 'arcsecond';

import Logger from '../../logger.js';
import Configuration from '../../configuration.js';
import PostDocCommand from '../../command.js';
import runAndMeasureAction from '../measured-action.js';

const require = createRequire(import.meta.url);

class CommanderHelpParser {
  #newLine = pipeParsers([
    sequenceOf([possibly(char('\r')), char('\n')]),
    mapTo(() => '\n')
  ]);

  #usage = pipeParsers([
    sequenceOf([
      str('Usage:'),
      optionalWhitespace,
      // Command's signature
      everyCharUntil(this.#newLine),
      optionalWhitespace,
      // Command's description
      possibly(
        everyCharUntil(
          choice([
            str('Options:'),
            str('Commands:'),
            str('Arguments:'),
            endOfInput
          ])
        )
      ),
      // Command's arguments
      possibly(
        pipeParsers([
          sequenceOf([
            optionalWhitespace,
            str('Arguments:'),
            optionalWhitespace,
            // Argument's name
            everyCharUntil(whitespace),
            choice([
              pipeParsers([
                whitespace,
                // Argument's description
                everyCharUntil(choice([str('Options'), str('Commands')])),
                mapTo((description) => description.trim().replace(/\s+/g, ' '))
              ]),
              this.#newLine
            ])
          ]),
          mapTo(([, , , name, description]) => [name, description])
        ])
      )
    ]),
    mapTo(([, , signature, , description, possiblyArgument]) => {
      const [argumentName, argumentDescription] = possiblyArgument ?? [];

      const signatureWords = signature.trim().split(/\s+/);
      const nameIndex =
        signatureWords.findIndex((word) => word.startsWith('[')) - 1;

      return {
        name: signatureWords[nameIndex],
        signature: signature.trim(),
        description: description.trim(),
        argument: argumentName
          ? {
            name: argumentName,
            description: argumentDescription
          }
          : null
      };
    })
  ]);

  #options = pipeParsers([
    str('Options:'),
    many1(
      pipeParsers([
        optionalWhitespace,
        str('--'),
        sequenceOf([
          // Option's full name
          everyCharUntil(whitespace),
          possibly(
            pipeParsers([
              between(whitespace)(whitespace)(char('/')),
              char('-'),
              letter
            ])
          ),
          choice([
            pipeParsers([
              regex(/^[ \t]+/),
              sequenceOf([
                everyCharUntil(this.#newLine),
                many(
                  pipeParsers([
                    sequenceOf([
                      this.#newLine,
                      regex(/^[ \t]{5,}/),
                      everyCharUntil(this.#newLine)
                    ]),
                    mapTo(([, , description]) => description)
                  ])
                )
              ]),
              mapTo(([start, parts]) =>
                parts.length ? start + ' ' + parts.join(' ') : start
              )
            ]),
            this.#newLine
          ])
        ]),
        mapTo(([name, letter, description]) => ({
          name,
          shortSymbol: letter,
          description
        }))
      ])
    ),
    skip(optionalWhitespace)
  ]);

  #subcommands = pipeParsers([
    str('Commands:'),
    everyCharUntil(this.#newLine),
    many(
      pipeParsers([
        sequenceOf([
          regex(/^\s{2,4}/),
          // Subcommand's name
          everyCharUntil(whitespace),
          // Subcommand's description
          choice([
            pipeParsers([
              sequenceOf([
                regex(/^[ \t]+/),
                everyCharUntil(this.#newLine),
                many(
                  pipeParsers([
                    sequenceOf([
                      this.#newLine,
                      regex(/^[ \t]{5,}/),
                      everyCharUntil(this.#newLine)
                    ]),
                    mapTo(([, , description]) => description)
                  ])
                )
              ]),
              mapTo(([, start, parts]) =>
                parts.length ? start + ' ' + parts.join(' ') : start
              )
            ]),
            this.#newLine
          ])
        ]),
        mapTo(([, name, description]) => ({
          name,
          description: description.trim()
        }))
      ])
    ),
    skip(optionalWhitespace)
  ]);

  parse(text) {
    return pipeParsers([
      sequenceOf([
        this.#usage,
        optionalWhitespace,
        possibly(pipeParsers([this.#options, skip(optionalWhitespace)])),
        possibly(this.#subcommands)
      ]),
      mapTo(([usage, , options, commands]) => ({
        usage,
        options,
        commands
      }))
    ]).run(text);
  }
}

class HelpOutputCollector {
  #parser;
  #executablePath;

  // This was taken from the chalk package and modified.
  // https://github.com/chalk/ansi-regex/blob/main/index.js
  #ansiEscapeCodesRe = new RegExp(
    [
      '[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)',
      '(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))'
    ].join('|'),
    'g'
  );

  constructor(parser, executablePath) {
    this.#parser = parser;
    this.#executablePath = executablePath;
  }

  #obtainCommandOutput([executableName, ...executableArguments]) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(executableName, executableArguments, {
        cwd: cwd(),
        env
      });

      let cliOutput = '';

      childProcess.stdout.on('data', (data) => {
        cliOutput += data;
      });

      childProcess.on('exit', ({ exitCode }) => {
        const strippedOutput = cliOutput.replace(this.#ansiEscapeCodesRe, '');

        exitCode ? reject(strippedOutput) : resolve(strippedOutput);
      });
    });
  }

  #incorporateCommandInto(cliArguments, commandName) {
    // Just makes a copy to avoid polluting original value.
    cliArguments = cliArguments.slice();

    const lastArgument = cliArguments.pop();

    cliArguments.push(commandName, lastArgument);

    return cliArguments;
  }

  async #collectCommand(cliArgument) {
    const output = await this.#obtainCommandOutput(cliArgument);

    const parsedOutput = this.#parser.parse(output);

    if (parsedOutput.isError) {
      Logger.log(() => parsedOutput.error, Logger.ErrorLevel);
    } else {
      const children = await Promise.all(
        parsedOutput.result.commands
          ?.map((subcommand) => subcommand.name)
          .filter((commandName) => commandName !== 'help')
          .map((commandName) =>
            this.#incorporateCommandInto(cliArgument, commandName)
          )
          .map((nextCliAgruments) => this.#collectCommand(nextCliAgruments)) ??
          []
      );

      return {
        name: parsedOutput.result.usage.name,
        options: parsedOutput.result.options,
        children,
        argument: parsedOutput.result.usage.argument,
        signature: parsedOutput.result.usage.signature,
        description: parsedOutput.result.usage.description
      };
    }
  }

  collect() {
    return this.#collectCommand(['node', this.#executablePath, '--help']);
  }
}

function createHTMLFromCommand(command) {
  const options = command.options
    ?.map(
      (option) =>
        `- **${option.name}${
          option.shortSymbol ? ` | ${option.shortSymbol}` : ''
        }** ${option.description ?? ''}`
    )
    .join('\n');

  const subcommands = command.children
    .map((command) => `- **${command.name}** ${command.description ?? ''}`)
    .join('\n');

  return (
    `# ${command.name}\n\n## Usage\n\n\`\`\`sh ${command.signature}\`\`\`` +
    (command.description ? `\n\n${command.description}\n\n` : '') +
    (command.argument
      ? `\n\n### Argument\n\n- **${command.argument.name}** ${
        command.argument.description
          ? command.argument.description.trim()
          : ''
      }`
      : '') +
    (options ? `\n\n## Options\n\n${options}` : '') +
    (subcommands.length ? `\n\n## Subcommands\n\n${subcommands}` : '')
  );
}

async function createPagesFromCommand(command, parentNames = []) {
  const configuration = Configuration.get();

  const outputPagePath = resolve(
    configuration.directories.pages,
    ...parentNames,
    command.name,
    'index.md'
  );

  if (command.children) {
    const children = await Promise.all(
      command.children.map((child) =>
        createPagesFromCommand(child, parentNames.concat(command.name))
      )
    );

    return children
      .flat()
      .concat(
        new GeneratedPage(createHTMLFromCommand(command), outputPagePath)
      );
  }

  return [new GeneratedPage(createHTMLFromCommand(command), outputPagePath)];

}

const DEFAULT_PAGE_CONTENT = `
---
draft: true
---

# Main header

> Intelligence is the ability to avoid doing work, yet getting the work done.
> - Linus Torvalds
`;

class GeneratedPage {
  #content;
  #outputFilePath;

  constructor(content, outputPath) {
    if (existsSync(outputPath)) {
      throw new Error('The page already exists.');
    }

    this.#content = content;
    this.#outputFilePath = outputPath;
  }

  get url() {
    const configuration = Configuration.get();

    return this.#outputFilePath
      .replace(resolve(configuration.directories.pages), '')
      .replaceAll(sep, '/')
      .replace('.md', '.html');
  }

  get name() {
    const name = basename(this.#outputFilePath, extname(this.#outputFilePath));

    if (name === 'index') {
      if (this.url === '/index.html') {
        return name;
      }

      return basename(resolve(this.#outputFilePath, '..'));

    }

    return name;

  }

  get outputPath() {
    return this.#outputFilePath;
  }

  async write() {
    const outputPageDirectoryPath = dirname(this.#outputFilePath);

    if (!existsSync(outputPageDirectoryPath)) {
      await mkdir(outputPageDirectoryPath, { recursive: true });
    }

    await writeFile(this.#outputFilePath, this.#content, 'utf8');
  }

  async clearIfPresent() {
    if (existsSync(this.#outputFilePath)) {
      await unlink(this.#outputFilePath);
    }
  }
}

const DEFAULT_PAGE_OBJECT_CONTENT = `
module.exports = {
  url: "{url}",
  elements: {
    header: {
      selector: "h1"
    },
    quote: {
      selector: "blockquote"
    }
  }
};
`.trim();

const DEFAULT_TEST_CONTENT = `
describe("{pageName}", function () {
  test("heading and quote should be visible", function (browser) {
    const {pageName} = browser.page.{pagePathParts}();

    {pageName}
      .navigate()
      .assert.visible("@header")
      .assert.visible("@quote");

    browser.end();
  });
});
`.trim();

const DEFAULT_CLI_PAGE_OBJECT_CONTENT = `
module.exports = {
  url: "{url}",
  elements: {
    header: {
      selector: "h2"
    },
    usage: {
      selector: "code"
    }
  }
};
`.trim();

const DEFAULT_CLI_TEST_CONTENT = `
describe("{pageName}", function () {
  test("heading and quote should be visible", function (browser) {
    const {pageName} = browser.page.{pagePathParts}();

    {pageName}
      .navigate()
      .assert.visible("@header")
      .assert.visible("@usage");

    browser.end();
  });
});
`.trim();

class GeneratedTest {
  #outputMainContent;
  #outputMainFilePath;
  #outputPageObjectContent;
  #outputPageObjectFilePath;

  constructor(page, mainTestContent, pageObjectContent) {
    const configuration = Configuration.get();
    const rootTestsDirectory = resolve(configuration.directories.tests);
    const pageObjectsDirectoryPath = join(rootTestsDirectory, 'page-objects');

    this.#outputMainFilePath = page.outputPath
      .replace(
        resolve(configuration.directories.pages),
        join(rootTestsDirectory, 'src')
      )
      .replace(extname(page.outputPath), '.js');
    this.#outputPageObjectFilePath = this.#outputMainFilePath
      .replace(join(rootTestsDirectory, 'src'), pageObjectsDirectoryPath)
      .replace('.js', '.cjs');

    if (existsSync(this.#outputMainFilePath)) {
      throw new Error('The test already exists.');
    }

    if (existsSync(this.#outputPageObjectFilePath)) {
      throw new Error('The page object already exists.');
    }

    this.#outputMainContent = mainTestContent
      .replaceAll('{pageName}', page.name)
      .replaceAll(
        '{pagePathParts}',
        this.#outputPageObjectFilePath
          .replace(pageObjectsDirectoryPath + sep, '')
          .replace('.cjs', '')
          .split(sep)
          .join('.')
      );
    this.#outputPageObjectContent = pageObjectContent.replaceAll(
      '{url}',
      page.url
    );
  }

  async write() {
    const outputMainFileDirectoryPath = dirname(this.#outputMainFilePath);
    const outputPageObjectFileDirectoryPath = dirname(
      this.#outputPageObjectFilePath
    );

    if (!existsSync(outputMainFileDirectoryPath)) {
      await mkdir(outputMainFileDirectoryPath, { recursive: true });
    }

    if (!existsSync(outputPageObjectFileDirectoryPath)) {
      await mkdir(outputPageObjectFileDirectoryPath, { recursive: true });
    }

    await writeFile(this.#outputMainFilePath, this.#outputMainContent, 'utf8');
    await writeFile(
      this.#outputPageObjectFilePath,
      this.#outputPageObjectContent,
      'utf8'
    );
  }

  async clearIfPresent() {
    if (existsSync(this.#outputMainFilePath)) {
      await unlink(this.#outputMainFilePath);
    }
  }
}

export default function createPagesCommand() {
  return new PostDocCommand('pages')
    .argument('[urls...]', 'URLs of new pages.')
    .description('Creates new pages and minimal tests for them.')
    .option(
      '--from-cli <path>',
      'Tries to generate API pages based on the <path> project\'s CLI commands and options.'
    )
    .action((urls, { fromCli }) =>
      runAndMeasureAction(async () => {
        const configuration = Configuration.get();

        if (fromCli) {
          const projectPackageJson = require(resolve(fromCli, 'package.json'));

          if (!projectPackageJson) {
            Logger.log(
              () =>
                'Cannot generate CLI API pages from a project without a package.json file.',
              Logger.ErrorLevel
            );

            return;
          }

          if (!projectPackageJson.bin) {
            Logger.log(
              () =>
                'The current package has not CLI functionality. No pages were generated.'
            );

            return;
          }

          const hasCommanderDependency = pipeWith(
            Iterable.from(function* () {
              if ('dependencies' in projectPackageJson) {
                for (const key in projectPackageJson.dependencies) {
                  yield key;
                }
              }
            }),
            Iterable.concat(
              Iterable.from(function* () {
                if ('devDependencies' in projectPackageJson) {
                  for (const key in projectPackageJson.devDependencies) {
                    yield key;
                  }
                }
              })
            ),
            Iterable.unique,
            Iterable.any((key) => key === 'commander')
          );

          if (!hasCommanderDependency) {
            Logger.log(
              (typography) => `
                Cannot generate CLI API pages because only ${typography.bold(
    'commander'
  )} package is supported,
                but it isn't listed in dependency lists.
              `,
              Logger.ErrorLevel
            );

            return;
          }

          const executablePath =
            typeof projectPackageJson.bin === 'string'
              ? projectPackageJson.bin
              : Object.values(projectPackageJson.bin).at(0);

          if (!executablePath) {
            Logger.log(
              (typography) =>
                `Cannot generete CLI API pages because there is no binary found for the ${typography.bold(
                  projectPackageJson.name
                )} package.`,
              Logger.ErrorLevel
            );

            return;
          }

          const parser = new CommanderHelpParser();
          const collector = new HelpOutputCollector(
            parser,
            join(fromCli, executablePath)
          );

          const command = await collector.collect();

          const pages = await createPagesFromCommand(command);

          for (const page of pages) {
            await page.write();

            try {
              const test = new GeneratedTest(
                page,
                DEFAULT_CLI_TEST_CONTENT,
                DEFAULT_CLI_PAGE_OBJECT_CONTENT
              );

              await test.write();
            } catch {
              Logger.log(
                (typography) => `
                The test for ${typography.bold(page.url)} URL already exists.
                  Skipping...
              `,
                Logger.ErrorLevel
              );
            }
          }
        } else {
          for (const url of urls) {
            const prefixedUrl = url.startsWith('/') ? url : '/' + url;
            const urlWithExtension = prefixedUrl.endsWith('.md')
              ? prefixedUrl
              : prefixedUrl + '.md';

            const pageOutputPath = resolve(
              configuration.directories.pages,
              urlWithExtension.slice(1).replaceAll('/', sep)
            );

            let page;

            try {
              page = new GeneratedPage(DEFAULT_PAGE_CONTENT, pageOutputPath);
            } catch {
              Logger.log(
                (typography) => `
                The page with ${typography.bold(url)} URL already exists.
                  Skipping...
              `,
                Logger.ErrorLevel
              );

              continue;
            }

            let test;

            try {
              test = new GeneratedTest(
                page,
                DEFAULT_TEST_CONTENT,
                DEFAULT_PAGE_OBJECT_CONTENT
              );
            } catch {
              Logger.log(
                (typography) => `
                The test for ${typography.bold(url)} URL already exists.
                  Skipping...
              `,
                Logger.ErrorLevel
              );

              continue;
            }

            try {
              await page.write();
              await test.write();
            } catch (error) {
              Logger.log(
                (typography) => `
                  The ${typography.dim(url)} page generation is failed due to:
                    ${inspect(error, { colors: true, depth: Infinity })}  
                    Clearing artifacts...
                `,
                Logger.ErrorLevel
              );

              await page.clearIfPresent();
              await test.clearIfPresent();
            }
          }
        }

        Logger.log(
          () => `
          Pages and test suites are generated.
        `,
          Logger.SuccessLevel
        );
      })
    );
}
