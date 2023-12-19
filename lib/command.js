import { Command, Help } from 'commander';

import Logger from './logger.js';

class PostDocHelp extends Help {
  #typography = Logger.get().typography;

  formatHelp(command, helper) {
    const helpText = super.formatHelp(command, helper);

    return helpText
      .replace(/Commands:/g, this.#typography.grey('Commands:'))
      .replace(/Options:/g, this.#typography.gray('Options:'))
      .replace(/Usage:([^\n]+)/g, (_, text) => {
        const [command, ...argumentPatterns] = this.#typography
          .reset(text.trim())
          .split(' ');

        return `Usage: ${this.#typography.bold(this.#typography.cyan(command))} ${this.#typography.magenta(argumentPatterns.join(' '))}`;
      });
  }

  subcommandDescription(command) {
    return this.#typography.gray(command.description());
  }

  optionDescription(option) {
    return this.#typography.gray(option.description);
  }

  optionTerm(option) {
    const longFlag = option.long;
    const shortFlag = option.short ? option.short.replace(/(-\w+),?/, ' / $1') : '';
    const combinedFlag = longFlag + shortFlag;

    return combinedFlag.padEnd(35, ' ');
  }

  commandUsage(cmd) {
    const usage = cmd.usage();
    const commandUsage = usage ? ' ' + this.#typography.magenta(usage) : '';

    return (this.#typography.bold(this.#typography.cyan(cmd.name())) + commandUsage);
  }

  subcommandTerm(cmd) {
    const hasAliases = cmd.alias() && cmd.alias().length > 0;

    return cmd.name() + (hasAliases ? ' / ' + cmd.alias() : '');
  }
}

export default class PostDocCommand extends Command {
  createHelp() {
    return new PostDocHelp();
  }
}
