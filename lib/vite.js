import { cwd } from 'node:process';
import { existsSync } from 'node:fs';
import { join, resolve, sep, normalize } from 'node:path';

import AsyncIterable from '@halo-lab/iterable/async';
import { VitePWA } from 'vite-plugin-pwa';
import { pipeWith } from 'pipe-ts';
import { mergeConfig } from 'vite';

import Configuration from './configuration.js';
import { walkDirectory } from './fs.js';

class PostDocRenderVitePlugin {
  #collector;

  name = 'postdoc-render';
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

class PostDocRebaseVitePlugin {
  #configuration;
  #viteConfiguration;

  name = 'postdoc-rebase';
  configResolved = (config) => {
    this.#viteConfiguration = config;
  };
  transformIndexHtml = {
    order: 'pre',
    handler: (html, context) => {
      const fileUrlRe = /\/\S+\.\S+/;
      const links = new Set(Array.from(html.matchAll(/'\/[^']*'|"\/[^"]*"/g))
        .filter(([match]) => fileUrlRe.test(match))
        .map(([match]) => match.slice(1, -1)));

      if (!links.size) {
        return html;
      }

      const toRootUrlPrefix = normalize(context.filename)
        .replace(cwd() + sep, '')
        .split(sep)
        .slice(1)
        .map(() => '..')
        .join('/');
      const publicDirectory = resolve(this.#viteConfiguration.publicDir);
      const nonEscapedSeparatorRe = /\s+/;

      for (const match of links) {
        const urls = new Set(match.split(nonEscapedSeparatorRe).filter((value) => value.startsWith('/')));

        for (const url of urls) {
          if (!existsSync(join(publicDirectory, ...url.split('/')))) {
            html = html.replaceAll(url, toRootUrlPrefix + url);
          }
        }
      }

      return html;
    }
  };

  constructor(configuration) {
    this.#configuration = configuration;
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
    this.plugins = [
      new PostDocRebaseVitePlugin(configuration),
      new PostDocRenderVitePlugin(collector),
      VitePWA(configuration.pwa)
    ];
    this.build = {
      outDir: resolve(configuration.directories.output), emptyOutDir: true
    };
  }
}
