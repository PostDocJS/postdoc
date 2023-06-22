import {CustomCommand} from '../utils/custom-command.js';
import {previewProject} from '../bundler/index.js';
import {defineMode, Mode} from '../mode.js';

/** Preview command. */
export const preview = () =>
  new CustomCommand('preview')
    .argument('[url]', 'URL to opend after the server is started')
    .option('-b | --browser [name]', 'Automatically open the app in the browser on server start.', false)
    .option('-h | --host [url]', 'The proxy option for the Vite\'s "host" CLI argument. It exposes the dev and preview server to the LAN and public addresses.')
    .action(async (url, {host, browser}) => {
      defineMode(Mode.Stage);

      await previewProject(browser, url, host);
    });

