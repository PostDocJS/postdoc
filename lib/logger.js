import { Chalk, supportsColor } from 'chalk';

import Configuration from './configuration.js';

const INDENT_RE = /^(\s+)\S+/;

const Symbols = {
  /** ✓ character. */
  Check: '\u2713',
  /** × character. */
  Cross: '\u00D7',
  /** ❖ character. */
  Diamond: '\u2756',
  /** ! character. */
  Exclamation: '\u0021'
};

export default class Logger {
  static #instance;

  static InfoLevel = 'info';
  static DebugLevel = 'debug';
  static ErrorLevel = 'error';
  static WarningLevel = 'warn';
  static SuccessLevel = 'log';

  static initialise() {
    this.#instance = new Logger();
  }

  static debug(createText) {
    if (!this.get().#verbose) {
      return;
    }

    this.get().log(createText(this.#instance.typography), this.DebugLevel);
  }

  static log(createText, level) {
    this.get().log(createText(this.#instance.typography), level);
  }

  static get() {
    if (!this.#instance) {
      throw new Error('Logger is not initialised yet.');
    }

    return this.#instance;
  }

  #isQuiet;
  #verbose;

  constructor() {
    const configuration = Configuration.get();

    this.#isQuiet = configuration.logger.quiet;
    this.#verbose = configuration.logger.verbose || process.env.DEBUG === '1';

    this.typography = new Chalk({
      level: configuration.logger.noColors || supportsColor === false ? 0 : supportsColor.level
    });
  }

  log(text, level = Logger.InfoLevel) {
    if (this.#isQuiet && level !== Logger.ErrorLevel) {
      return;
    }

    const dedentedText = this.#dedentText(text);
    const textWithSymbol = this.#attachSymbol(dedentedText, level);

    globalThis.console[level](textWithSymbol);
  }

  #dedentText(text) {
    const lines = text.replace(/\t/g, '  ').split('\n');

    const minimalIndent = lines.reduce((indent, line) => {
      const match = INDENT_RE.exec(line);

      if (match) {
        return Math.min(indent, match[1].length);
      }

      return indent;
    }, Number.MAX_VALUE);

    return lines
      .map((line, index, lines) => {
        const trimmedLine = line.trim();

        if (
          (index === 0 && trimmedLine === '') ||
          (index === lines.length - 1 && trimmedLine === '')
        ) {
          return null;
        }

        return line.startsWith(' ') ? line.slice(minimalIndent) : line;
      })
      .filter((line) => line !== null)
      .join('\n');
  }

  #attachSymbol(text, level) {
    return text
      .split('\n')
      .map((line, index) => {
        if (index === 0) {
          switch (level) {
            case Logger.InfoLevel:
            case Logger.DebugLevel:
              return this.typography.magenta(Symbols.Diamond) + ' ' + line;

            case Logger.ErrorLevel:
              return this.typography.red(Symbols.Cross) + ' ' + line;

            case Logger.WarningLevel:
              return this.typography.yellow(Symbols.Exclamation) + ' ' + line;

            case Logger.SuccessLevel:
              return this.typography.green(Symbols.Check) + ' ' + line;
          }

          return;
        }

        return '  ' + line;
      })
      .join('\n');
  }
}
