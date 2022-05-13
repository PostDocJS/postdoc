import { Command } from 'commander';

import { info } from '../../logger/mod.js';

/** Creates a `test` subcommand for the `create` command. */
export default (): Command =>
	new Command('test')
		.description('Runs all test declared in the project')
		.action(() => info`--- Test results should be here. ---`);
