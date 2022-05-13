import { Command } from 'commander';

import { emphasize, info } from '../../logger/mod.js';

/** Crates a `run` command for the PostDoc CLI. */
export default (): Command =>
	new Command('run')
		.description('Starts development server with HMR and live preview')
		.action(
			() =>
				info`The develompent server is running on ${emphasize(
					'localhost:3434',
				)}`,
		);
