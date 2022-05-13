import { Command } from 'commander';

import { info, emphasize } from '../../logger/mod.js';

/** Creates a `page` subcommand for the `create` command. */
export default (): Command =>
	new Command('page')
		.argument(
			'<name>',
			'Name of a new page. It will be served as a URL path also',
		)
		.option('--test', 'Generates a test for the <name> page', false)
		.description('Creates a new page that will be available with /<name> URL')
		.action(
			(name, { test }) =>
				info`The ${emphasize(name)} page ${
					test ? 'and a test suite are' : 'is'
				} created.`,
		);
