import { Command } from 'commander';

import run from './commands/run/mod.js';
import init from './commands/init/mod.js';
import test from './commands/test/mod.js';
import build from './commands/build/mod.js';
import create from './commands/create/mod.js';

export default (): Command =>
	new Command()
		.version('0.0.1', '-v | --version')
		.addCommand(run())
		.addCommand(init())
		.addCommand(test())
		.addCommand(build())
		.addCommand(create());
