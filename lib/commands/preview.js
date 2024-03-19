/**
 * Builds a project for production and starts a simple static server over built assets.
 * The command can accept two options:
 *
 * 1. `--host [url]` - exposes the dev server to the LAN and public addresses.
 * 2. `--open [url]` - automatically opens a browser on provided URL or `/index.html`
 *   if no argument is provided. To set the browser to open see
 *   [Vite's documentation](https://vitejs.dev/config/server-options.html#server-open).
 *
 * @name preview
 * @since 0.1.0
 */

import { build, preview } from 'vite';
import runSearchIndex from '../search-index.js';

import Logger from '../logger.js';
import Collector from '../collector.js';
import PostDocCommand from '../command.js';
import ViteConfiguration from '../vite.js';
import runAndMeasureAction from './measured-action.js';

export const runPreview = async ({ host, open, skipBuild = false } = {}) => {
  const collector = new Collector();

  if (!skipBuild) {
    try {
      await collector.collectPages();
      await collector.writePages();

      const inlineConfig = await ViteConfiguration.createForProduction(
        collector
      );

      await build(inlineConfig);
    } catch {
      return;
    } finally {
      await runSearchIndex();
      await collector.clear();
    }
  }

  const inlineConfig = ViteConfiguration.createForPreview(collector, {
    preview: {
      host,
      open
    }
  });

  const server = await preview(inlineConfig);

  Logger.log(
    () => `
      Server is listening on:
        - ${server.resolvedUrls.local.join(' | ')}
        ${server.resolvedUrls.network.length
        ? '- ' + server.resolvedUrls.network.join(' | ')
        : ''
      }
    `,
    Logger.SuccessLevel
  );

  return server;
};

export default function createPreviewCommand() {
  return new PostDocCommand('preview')
    .description('Builds the project for production and starts a static dev server from the output.')
    .option(
      '-o | --open [url]',
      'Automatically open the app in the browser on server start.'
    )
    .option(
      '-s | --skip-build',
      'Skip the build step and use the existing output folder.'
    )
    .option(
      '-h | --host [url]',
      'The proxy option for the Vite\'s "host" CLI argument. It exposes the dev and preview server to the LAN and public addresses.'
    )
    .action(({ host, open, skipBuild }) =>
      runAndMeasureAction(() => runPreview({ host, open, skipBuild })));
}
