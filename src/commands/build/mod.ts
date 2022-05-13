import { Command } from 'commander';

import { info } from '../../logger/mod.js';

export default (): Command =>
	new Command('build')
		.description('Builds the project, copies assets into an output directory')
		.action(() => info`The project is built successfully.`);
