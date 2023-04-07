import {env} from 'node:process';

import {apps} from 'open';
import {Command, Option} from 'commander';

import {Directory} from '../files.js';
import {Container} from '../utils/container.js';
import {buildProject} from '../bundler/index.js';
import {CONFIGURATION_ID} from '../configuration/index.js';
import {defineMode, Mode} from '../mode.js';
import {startPreviewServer} from '../bundler/vite/index.js';

/** Preview command. */
export const preview = () =>
  new Command('preview')
    .argument('[url]', 'URL to opend after the server is started', '/index.html')
    .addOption(
      new Option('-b | --browser [name]', 'A browser to open a URL.')
        .default('default', 'System browser. Works only for chrome, firefox and edge.')
        .choices(['default', 'chrome', 'firefox', 'edge'])
    )
    .action(async (url, {browser}) => {
      defineMode(Mode.Stage);

      /** @type {import("../configuration/defaults.js").Configuration} */
      const configuration = Container.get(CONFIGURATION_ID);

      const outputDirectory = Directory(configuration.directories.output);

      if (!outputDirectory.exists()) {
        await buildProject();
      }

      switch (browser) {
        case 'chrome':
          env.BROWSER = apps.chrome;
          break;
        case 'firefox':
          env.BROWSER = apps.firefox;
          break;
        case 'edge':
          env.BROWSER = apps.edge;
          break;
        default:
          env.BROWSER = apps.browser;
      }

      await startPreviewServer(configuration, {
        preview: {
          open: url
        }
      });
    });

