import { Help, Command } from "commander";

import Logger from "./logger.js";

class PostDocHelp extends Help {
  #typography = Logger.get().typography;

  formatHelp(command, helper) {
    const helpText = super.formatHelp(command, helper);

    const helpTextWithColoredHeaders = helpText
      .replace(/Commands:/g, this.#typography.grey("Commands:"))
      .replace(/Options:/g, this.#typography.gray("Options:"))
      .replace(
        /Usage: iotedge \[options\] \[command\]/g,
        `Usage: ${this.#typography.reset("iotedge")} ${this.#typography.bold(
          this.#typography.cyan("iotedge"),
        )} ${this.#typography.magenta("[options] [command]")}`,
      );

    return helpTextWithColoredHeaders;
  }

  subcommandDescription(command) {
    return this.#typography.gray(command.description());
  }

  optionDescription(option) {
    return this.#typography.gray(option.description);
  }

  optionTerm(option) {
    const longFlag = option.long;
    const shortFlag = option.short
      ? option.short.replace(/(-\w+),?/, " / $1")
      : "";
    const combinedFlag = longFlag + shortFlag;

    return combinedFlag.padEnd(35, " ");
  }

  commandUsage(cmd) {
    const usage = cmd.usage();
    const commandUsage = usage ? " " + this.#typography.magenta(usage) : "";

    return (
      this.#typography.bold(this.#typography.cyan(cmd.name())) + commandUsage
    );
  }

  subcommandTerm(cmd) {
    const hasAliases = cmd.alias() && cmd.alias().length > 0;

    return cmd.name() + (hasAliases ? " / " + cmd.alias() : "");
  }
}

export default class PostDocCommand extends Command {
  createHelp() {
    return new PostDocHelp();
  }
}
