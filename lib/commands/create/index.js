/**
 * @file Combines the `page` and `test` subcommands under the `create` command.
 */

import {Command} from 'commander';

import {page} from './page-command.js';
import {test} from './test-command.js';
import {include} from './include-command.js';

/** Creates a `create` command for the PostDoc CLI. */
export const create = () =>
  new Command('create')
    .description(
      'Generates assets depending on the used subcommand. See "page", "test" and "component" subcommands.'
    )
    .addCommand(page())
    .addCommand(test())
    .addCommand(include());
