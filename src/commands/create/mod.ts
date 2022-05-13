import { Command } from 'commander';

import page from './page.command.js';
import test from './test.command.js';

/** Crates a `create` command for the PostDoc CLI. */
export default (): Command =>
	new Command('create').addCommand(page()).addCommand(test());
