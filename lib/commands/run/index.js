import {serveProject} from '../../bundler/index.js';
import {CustomCommand} from '../../utils/custom-command.js';
import {defineMode, Mode} from '../../mode.js';

/**
 * Starts a development server. Optionally it can open a browser
 * on a specified URL. By default only localhost is allowed to
 * connect to the browser, but you can expose the address to local area network.
 *
 * @since 0.1.0
 */
export const run = () =>
  new CustomCommand('run')
    .option(
      '-o | --open [name]',
      'Automatically open the app in the browser on server start.',
      false
    )
    .option('-u | --url [url]', 'URL to open after the server is started.')
    .option(
      '-h | --host [url]',
      'The proxy option for the Vite\'s "host" CLI argument. It exposes the dev and preview server to the LAN and public addresses.'
    )
    .description('Starts development server with HMR and live preview.')
    .action(async ({open, url, host}) => {
      defineMode(Mode.Dev);

      await serveProject({
        startUrl: url,
        autoOpenBrowser: open,
        allowRequestsFromPublicAddresses: host
      });
    });
