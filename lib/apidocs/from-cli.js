import { spawn } from "node:child_process";
import { cwd, env } from "node:process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import Iterable from "@halo-lab/iterable";
import { pipeWith } from "pipe-ts";
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
  optionalWhitespace,
} from "arcsecond";

import Logger from "../logger.js";

const require = createRequire(import.meta.url);

class CommanderHelpParser {
  #newLine = pipeParsers([
    sequenceOf([possibly(char("\r")), char("\n")]),
    mapTo(() => "\n"),
  ]);

  #usage = pipeParsers([
    sequenceOf([
      str("Usage:"),
      optionalWhitespace,
      // Command's signature
      everyCharUntil(this.#newLine),
      optionalWhitespace,
      // Command's description
      possibly(
        everyCharUntil(
          choice([
            str("Options:"),
            str("Commands:"),
            str("Arguments:"),
            endOfInput,
          ]),
        ),
      ),
      // Command's arguments
      possibly(
        pipeParsers([
          sequenceOf([
            optionalWhitespace,
            str("Arguments:"),
            optionalWhitespace,
            // Argument's name
            everyCharUntil(whitespace),
            choice([
              pipeParsers([
                whitespace,
                // Argument's description
                everyCharUntil(choice([str("Options"), str("Commands")])),
                mapTo((description) => description.trim().replace(/\s+/g, " ")),
              ]),
              this.#newLine,
            ]),
          ]),
          mapTo(([_1, _2, _3, name, description]) => [name, description]),
        ]),
      ),
    ]),
    mapTo(([_1, _2, signature, _3, description, possiblyArgument]) => {
      const [argumentName, argumentDescription] = possiblyArgument ?? [];

      const signatureWords = signature.trim().split(/\s+/);
      const nameIndex =
        signatureWords.findIndex((word) => word.startsWith("[")) - 1;

      return {
        name: signatureWords[nameIndex],
        signature: signature.trim(),
        description: description.trim(),
        argument: argumentName
          ? {
              name: argumentName,
              description: argumentDescription,
            }
          : null,
      };
    }),
  ]);

  #options = pipeParsers([
    str("Options:"),
    many1(
      pipeParsers([
        optionalWhitespace,
        str("--"),
        sequenceOf([
          // Option's full name
          everyCharUntil(whitespace),
          possibly(
            pipeParsers([
              between(whitespace)(whitespace)(char("/")),
              char("-"),
              letter,
            ]),
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
                      everyCharUntil(this.#newLine),
                    ]),
                    mapTo(([_1, _2, description]) => description),
                  ]),
                ),
              ]),
              mapTo(([start, parts]) =>
                parts.length ? start + " " + parts.join(" ") : start,
              ),
            ]),
            this.#newLine,
          ]),
        ]),
        mapTo(([name, letter, description]) => ({
          name,
          shortSymbol: letter,
          description,
        })),
      ]),
    ),
    skip(optionalWhitespace),
  ]);

  #subcommands = pipeParsers([
    str("Commands:"),
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
                      everyCharUntil(this.#newLine),
                    ]),
                    mapTo(([_1, _2, description]) => description),
                  ]),
                ),
              ]),
              mapTo(([_1, start, parts]) =>
                parts.length ? start + " " + parts.join(" ") : start,
              ),
            ]),
            this.#newLine,
          ]),
        ]),
        mapTo(([_1, name, description]) => ({
          name,
          description: description.trim(),
        })),
      ]),
    ),
    skip(optionalWhitespace),
  ]);

  parse(text) {
    return pipeParsers([
      sequenceOf([
        this.#usage,
        optionalWhitespace,
        possibly(pipeParsers([this.#options, skip(optionalWhitespace)])),
        possibly(this.#subcommands),
      ]),
      mapTo(([usage, _1, options, commands]) => ({
        usage,
        options,
        commands,
      })),
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
      "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
      "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-nq-uy=><~]))",
    ].join("|"),
    "g",
  );

  constructor(parser, executablePath) {
    this.#parser = parser;
    this.#executablePath = executablePath;
  }

  #obtainCommandOutput([executableName, ...executableArguments]) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(executableName, executableArguments, {
        cwd: cwd(),
        env,
      });

      let cliOutput = "";

      childProcess.stdout.on("data", (data) => {
        cliOutput += data;
      });

      childProcess.on("exit", ({ exitCode }) => {
        const strippedOutput = cliOutput.replace(this.#ansiEscapeCodesRe, "");

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
          .filter((commandName) => commandName !== "help")
          .map((commandName) =>
            this.#incorporateCommandInto(cliArgument, commandName),
          )
          .map((nextCliAgruments) => this.#collectCommand(nextCliAgruments)) ??
          [],
      );

      return {
        name: parsedOutput.result.usage.name,
        options: parsedOutput.result.options,
        children,
        argument: parsedOutput.result.usage.argument,
        signature: parsedOutput.result.usage.signature,
        description: parsedOutput.result.usage.description,
      };
    }
  }

  collect() {
    return this.#collectCommand(["node", this.#executablePath, "--help"]);
  }
}

class PagesGenerator {
  #collector;
  #outputDirectoryPath;

  constructor(collector, outputDirectoryPath) {
    this.#collector = collector;
    this.#outputDirectoryPath = outputDirectoryPath;
  }

  #createHTML(command) {
    const options = command.options
      ?.map(
        (option) =>
          `- **${option.name}${
            option.shortSymbol ? ` | ${option.shortSymbol}` : ""
          }** ${option.description ?? ""}`,
      )
      .join("\n");

    const subcommands = command.children
      .map((command) => `- **${command.name}** ${command.description ?? ""}`)
      .join("\n");

    return (
      `# ${command.name}\n\n## Usage\n\n\`\`\`sh ${command.signature}\`\`\`` +
      (command.description ? `\n\n${command.description}\n\n` : "") +
      (command.argument
        ? `\n\n### Argument\n\n- **${command.argument.name}** ${
            command.argument.description
              ? command.argument.description.trim()
              : ""
          }`
        : "") +
      (options ? `\n\n## Options\n\n${options}` : "") +
      (subcommands.length ? `\n\n## Subcommands\n\n${subcommands}` : "")
    );
  }

  async #generate(command, parentNames) {
    const outputPagePath = resolve(
      this.#outputDirectoryPath,
      ...parentNames,
      command.name,
      "index.md",
    );

    if (command.children) {
      const children = await Promise.all(
        command.children.map((child) =>
          this.#generate(child, parentNames.concat(command.name)),
        ),
      );

      return children.flat().concat({
        content: this.#createHTML(command),
        outputPath: outputPagePath,
      });
    } else {
      return [
        {
          content: this.#createHTML(command),
          outputPath: outputPagePath,
        },
      ];
    }
  }

  async generateAndWrite() {
    const parsedCommand = await this.#collector.collect();

    if (!parsedCommand) {
      // An error was shown. Just return here.
      return;
    }

    const commands = await this.#generate(parsedCommand, []);

    await Promise.all(
      commands.map(async (command) => {
        const outputDirectoryPath = dirname(command.outputPath);

        if (!existsSync(outputDirectoryPath)) {
          await mkdir(outputDirectoryPath, { recursive: true });
        }

        await writeFile(command.outputPath, command.content, "utf8");
      }),
    );

    return true;
  }
}

export default async function generateCliApiPages(outputDirectoryPath) {
  const projectPackageJson = require(resolve("package.json"));

  if (!projectPackageJson) {
    Logger.log(
      () =>
        "Cannot generate CLI API pages from a project without a package.json file.",
      Logger.ErrorLevel,
    );

    return;
  }

  if (!projectPackageJson.bin) {
    Logger.log(
      () =>
        "The current package has not CLI functionality. No pages were generated.",
    );

    return;
  }

  const hasCommanderDependency = pipeWith(
    Iterable.from(function* () {
      if ("dependencies" in projectPackageJson) {
        for (const key in projectPackageJson.dependencies) {
          yield key;
        }
      }
    }),
    Iterable.concat(
      Iterable.from(function* () {
        if ("devDependencies" in projectPackageJson) {
          for (const key in projectPackageJson.devDependencies) {
            yield key;
          }
        }
      }),
    ),
    Iterable.unique,
    Iterable.any((key) => key === "commander"),
  );

  if (!hasCommanderDependency) {
    Logger.log(
      (typography) => `
        Cannot generate CLI API pages because only ${typography.bold(
          "commander",
        )} package is supported,
        but it isn't listed in dependency lists.
      `,
      Logger.ErrorLevel,
    );

    return;
  }

  const executablePath =
    typeof projectPackageJson.bin === "string"
      ? projectPackageJson.bin
      : Object.values(projectPackageJson.bin).at(0);

  if (!executablePath) {
    Logger.log(
      (typography) =>
        `Cannot generete CLI API pages because there is no binary found for the ${typography.bold(
          projectPackageJson.name,
        )} package.`,
      Logger.ErrorLevel,
    );

    return;
  }

  const parser = new CommanderHelpParser();
  const collector = new HelpOutputCollector(parser, executablePath);
  const generator = new PagesGenerator(collector, outputDirectoryPath);

  return generator.generateAndWrite();
}
