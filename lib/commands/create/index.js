/*
 * An intermediate command that allows creating entities in a
 * configured place. Currently only `pages` subcommand is
 * implemented.
 */

import PostDocCommand from '../../command.js';
import createPageCommand from './page.js';

export default function createCreateCommand() {
  return new PostDocCommand('create')
    // .description('Generates assets depending on the used subcommand.')
    .addCommand(createPageCommand());
}
