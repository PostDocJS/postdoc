import { resolve } from 'node:path';

import AsyncIterable from '@halo-lab/iterable/async';
import { VitePWA } from 'vite-plugin-pwa';
import { pipeWith } from 'pipe-ts';
import { mergeConfig } from 'vite';

import Configuration from './configuration.js';
import { walkDirectory } from './fs.js';

class PostDocVitePlugin {
  #collector;

  name = 'postdoc';
  apply = 'serve';
  configureServer = ({ middlewares: app, transformIndexHtml }) => {
    return () => {
      app.use(async (request, response, next) => {
        if (request.url.endsWith('.html') || request.url.endsWith('/')) {
          const page = this.#collector.pages.find((page) => page.url === request.url || page.url === request.url + 'index.html');

          if (page) {
            let pageHtml = await page.compile(this.#collector.pages, true);

            // ApiPage may return undefined for page whose document comments are
            // ignored. We cannot know that before creating page and parsing
            // code, so it is done while compiling the page.
            if (!pageHtml) {
              next(new Error(`The ${request.url} page is not found.`));
            } else {
              pageHtml = await transformIndexHtml(request.url, pageHtml);

              response.statusCode = 200;
              response.setHeader('Content-Type', 'text/html');
              response.write(pageHtml);
              response.end();
            }
          } else {
            next(new Error(`The ${request.url} page is not found.`));
          }
        } else {
          next();
        }
      });
    };
  };

  constructor(collector) {
    this.#collector = collector;
  }
}

export default class ViteConfiguration {
  static async createForProduction(temporaryDirectoryPath) {
    const defaultViteConfiguration = new ViteConfiguration('mpa');

    const directoryDescriptor = walkDirectory(temporaryDirectoryPath);

    const htmlPages = await pipeWith(directoryDescriptor.files, AsyncIterable.filter((file) => file.endsWith('.html')), AsyncIterable.enumerate, AsyncIterable.fold({}, (pages, [file, index]) => {
      pages[index] = file;

      return pages;
    }));

    return mergeConfig(defaultViteConfiguration, {
      root: temporaryDirectoryPath, build: {
        rollupOptions: {
          input: htmlPages
        }
      }
    });
  }

  static createForPreview(additionalViteConfiguration) {
    const defaultViteConfiguration = new ViteConfiguration('mpa');

    return mergeConfig(defaultViteConfiguration, additionalViteConfiguration);
  }

  static createForDevelopment(collector, additionalViteConfiguration) {
    const defaultViteConfiguration = new ViteConfiguration('custom', collector);

    defaultViteConfiguration.logLevel = 'silent';

    return mergeConfig(defaultViteConfiguration, additionalViteConfiguration);
  }

  constructor(appType, collector) {
    const configuration = Configuration.get();

    this.appType = appType;
    this.plugins = [new PostDocVitePlugin(collector), VitePWA(configuration.pwa)];
    this.build = {
      outDir: resolve(configuration.directories.output), emptyOutDir: true
    };
  }
}
