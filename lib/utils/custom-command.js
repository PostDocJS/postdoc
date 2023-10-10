import {Typography} from '../logger/colors.js';
import {Help, Command} from 'commander';

class CustomHelp extends Help {
  formatHelp(cmd, helper) {
    const helpText = super.formatHelp(cmd, helper);

    const helpTextWithColoredHeaders = helpText
      .replace(/Commands:/g, Typography().grey('Commands:'))
      .replace(/Options:/g, Typography().gray('Options:'))
      .replace(
        /Usage: iotedge \[options\] \[command\]/g,
        `Usage: ${Typography().reset('iotedge')} ${Typography().bold(
          Typography().cyan('iotedge')
        )} ${Typography().magenta('[options] [command]')}`
      );

    return helpTextWithColoredHeaders;
  }
  subcommandDescription(cmd) {
    return Typography().gray(cmd.description());
  }

  optionDescription(option) {
    return Typography().gray(option.description);
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
    const commandUsage = usage ? ' ' + Typography().magenta(usage) : '';

    return Typography().bold(Typography().cyan(cmd.name())) + commandUsage;
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
