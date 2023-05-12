import {Command} from 'commander';

import {previewProject} from '../bundler/index.js';
import {defineMode, Mode} from '../mode.js';

/** Preview command. */
export const preview = () =>
  new Command('preview')
    .argument('[url]', 'URL to opend after the server is started')
    .option('-b | --browser [name]', 'Automatically open the app in the browser on server start.', false)
    .action(async (url, {browser}) => {
      defineMode(Mode.Stage);

      await previewProject(browser, url);
    });

