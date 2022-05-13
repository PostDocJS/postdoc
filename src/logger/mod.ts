// This module encapsulates internal methods and instances,
// that is used to pass text to the stdout and stderr.
//
// Because we support colors that file reexports formatters
// that allow to colorize the output.

import piko from 'picocolors';

if (!piko.isColorSupported) {
	console.warn(
		'Seems like your terminal doesn\'t support colors or the "NO_COLORS" option is set. Consider switching to another terminal emulator or turning on colors for your terminal.',
	);
}

enum LogLevel {
	INFO,
	WARNING,
	ERROR,
}

export type Logger = (
	statics: TemplateStringsArray,
	...values: readonly (string | number | boolean)[]
) => void;

const log =
	(level: LogLevel): Logger =>
	(statics, ...values) => {
		const message = statics.reduce(
			(accumulator, part, index) =>
				accumulator + part + (index === values.length ? '' : values[index]),
			'',
		);

		switch (level) {
			case LogLevel.INFO:
				return console.log(message);
			case LogLevel.WARNING:
				return console.warn(message);
			case LogLevel.ERROR:
				return console.error(message);
			default:
				console.log(message);
		}
	};

export const info = log(LogLevel.INFO);
export const warn = log(LogLevel.WARNING);
export const error = log(LogLevel.ERROR);

/** This color should be used to emphasize the content's importance. */
export const emphasize = piko.green.bind(piko);
