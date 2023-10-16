import {page} from './page-command.js';
import {test} from './test-command.js';
import {include} from './include-command.js';
import {CustomCommand} from '../../utils/custom-command.js';

/**
 * An intermediate command that allow to create entities in a
 * configured place.
 *
 * @since 0.1.0
 */
export const create = () =>
  new CustomCommand('create')
    .description(
      'Generates assets depending on the used subcommand. See "page", "test" and "component" subcommands.'
    )
    .addCommand(page())
    .addCommand(test())
    .addCommand(include());
