import {CustomCommand} from '../utils/custom-command.js';
import {previewProject} from '../bundler/index.js';
import {defineMode, Mode} from '../mode.js';

/**
 * Builds a project for production and start a simple
 * static server over produced assets. Optionally it
 * can open a browser on a specified page.
 *
 * @since 0.1.0
 */
export const preview = () =>
  new CustomCommand('preview')
    .argument('[url]', 'URL to opend after the server is started')
    .option(
      '-b | --browser [name]',
      'Automatically open the app in the browser on server start.',
      false
    )
    .option(
      '-h | --host [url]',
      'The proxy option for the Vite\'s "host" CLI argument. It exposes the dev and preview server to the LAN and public addresses.'
    )
    .action(async (url, {host, browser}) => {
      defineMode(Mode.Stage);

      await previewProject(browser, url, host);
    });
