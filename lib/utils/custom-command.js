import chalk from 'chalk';
import {Help, Command} from 'commander';

class CustomHelp extends Help {
  formatHelp(cmd, helper) {
    const helpText = super.formatHelp(cmd, helper);

    const helpTextWithColoredHeaders = helpText
      .replace(/Commands:/g, chalk.grey('Commands:'))
      .replace(/Options:/g, chalk.gray('Options:'))
      .replace(
        /Usage: iotedge \[options\] \[command\]/g,
        `Usage: ${chalk.reset('iotedge')} ${chalk.bold(
          chalk.cyan('iotedge')
        )} ${chalk.magenta('[options] [command]')}`
      );

    return helpTextWithColoredHeaders;
  }
  subcommandDescription(cmd) {
    return chalk.gray(cmd.description());
  }

  optionDescription(option) {
    return chalk.gray(option.description);
  }

  optionTerm(option) {
    const longFlag = option.long;
    const shortFlag = option.short
      ? option.short.replace(/(-\w+),?/, ' / $1')
      : '';
    const combinedFlag = longFlag + shortFlag;

    return combinedFlag.padEnd(35, ' ');
  }
  commandUsage(cmd) {
    const usage = cmd.usage();
    const commandUsage = usage ? ' ' + chalk.magenta(usage) : '';
    
    return chalk.bold(chalk.cyan(cmd.name())) + commandUsage;
  }

  subcommandTerm(cmd) {
    const hasAliases = cmd.alias() && cmd.alias().length > 0;

    return cmd.name() + (hasAliases ? ' / ' + cmd.alias() : '');
  }
}

class CustomCommand extends Command {
  createHelp() {
    return new CustomHelp();
  }
  createCommand(cmd) {
    return new CustomCommand(cmd);
  }
}

export {CustomCommand};
