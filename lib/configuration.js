/**
 * <h2 id="overview">Overview</h2>
 *
 * PostDoc can be configured by own configuration file and by [Vite configuration file](https://vitejs.dev/config/).
 * You can maintain both in your project. A PostDoc configuration file contains
 * mostly PostDoc-specific properties. If some of them have the same meaning
 * as in Vite config file, the former wins.
 *
 * <h2 id="config-resolution">Config resolution</h2>
 *
 * PostDoc recognises next files as configuration from most important to the least one:
 *
 * 1. `postdoc.config.mjs`
 * 2. `postdoc.config.cjs`
 * 3. `postdoc.config.js`
 * 4. `postdoc.json`
 *
 * The first three files can default export either object or synchronous/asynchronous function
 * which returns an object of configuration values.
 *
 * <h2 id="directories">Directories</h2>
 *
 * In PostDoc you can configure the paths to directories for each entity
 * PostDoc recognises. Those are:
 *
 * 1. `content` - MD files with the main content for a page.
 * 2. `layouts` - EJS templates which contain the HTML that will load the content from MD files.
 * 3. `includes` - EJS components which can be included in layouts.
 * 4. `tests` - Nightwatch test files which contain test cases for pages; these will be run by the `test` command.
 * 5. `output` - destination directory for build files.
 *
 * Values of these entities in a configuration file must be relative to the configuration
 * file paths to desired directories. You can point out of the current working
 * directory as well.
 *
 * > `public` directory can be configured in the [Vite's config file](https://vitejs.dev/config/shared-options.html#publicdir).
 *
 * <h2 id="ignores">Ignores</h2>
 *
 * PostDoc reads all files in provided directories, but if you want to skip some of them,
 * you can provide a glob-filters of files that should be ignored.
 * You should follow the rules of the [anymatch](https://github.com/micromatch/anymatch) library.
 * Also, you can provide glob-filters for JS files which will be omitted while creating
 * API pages as well as standalone layout pages.
 *
 * <h2 id="api-docs">API docs</h2>
 *
 * Allows configuring where to take the JS files with JSDoc comments which of them have to be skipped
 * where to put the generated pages.
 *
 * - `tags` - is an object with methods that allows to handle unknown or custom JSDoc-like tags.
 *   The method's name should match with a tag's name. It accepts three arguments:
 *     1. tag object
 *     2. a complete comment object
 *     3. an object of previously structured tags.
 *   The method may return an object with structured data for this tag under some key,
 *   or it may return nothing. An object will be merged with all structured tags.
 *   > Be aware that top-level properties will be firstly accessible in EJS files while
 *   > using `page.comments` object.
 * - `source` - a relative path from the config file to directory with JS files which JSDoc
 *   should be taken from. If it is null or undefined, no API pages will be generated.
 * - `layout` - a path to the EJS layout file relatively to the `layouts` directory which
 *   will be used for creating API pages.
 * - `createUrl` - a function that allows to change an API page's URL from default
 *   (path from the `source` directory) to others. That URL will decide the output destination
 *   of the generated page as well.
 *
 * <h2 id="markdown">Markdown</h2>
 *
 * Configures the [marked](https://marked.js.org) compiler. There are a few options:
 *
 * 1. `options` - [options](https://marked.js.org/using_advanced#options) passed to the `Marked` constructor.
 * 2. `extensions` - a list of [extensions](https://marked.js.org/using_advanced#extensions) to enhance
 *   markdown capabilities.
 * 3. `shikiOptions` - PostDoc includes a common *highlight* extension via [shiki](https://shiki.matsu.io).
 *  For every code block the next structure is generated:
 *  ```html
 *  <div class="code-block">
 *    ...lightCodeVersion
 *    ...darkCodeVersion
 *  </div>
 *  ```
 *  You are responsible to show one version at a time depending on the project's dark mode settings.
 *  By default, the _github-light_ and _github-dark_ themes are used, but you can modify it by
 *  providing a comment line before all your code with the next patterns:
 *  ```js
 *  // light-theme=<theme-name> dark-theme=<theme-name>
 *  ```
 *  You can omit one of the patterns, if you want to modify only one pattern.
 *
 * <h2 id="app-settings">App settings</h2>
 *
 * Provides common values to every generated page to use while compiling HTML.
 * Whichever value is assigned to the `appSettings` property in config file is
 * available as a global `appSettings` variable in any EJS file.
 *
 * <h2 id="pwa">PWA</h2>
 *
 * PostDoc includes the [vite PWA plugin](https://github.com/vite-pwa/vite-plugin-pwa).
 * To configure it, assign the [configuration object](https://vite-pwa-org.netlify.app/guide/#configuring-vite-plugin-pwa)
 * to the `pwa` property.
 *
 * <h2 id="logger">Logger</h2>
 *
 * Logger configuration object contains two options:
 * 1. `quiet` - prevents non-error logs to be shown in standard output.
 * 2. `noColors` - disables colourful logs. PostDoc respects the [NO_COLOR](https://no-color.org)
 *   environment variable.
 *
 * @name configuration
 */

import { existsSync } from 'node:fs';
import { sep, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import deepmerge from 'deepmerge';
import { config } from 'dotenv';

const EnvironmentType = {
  MODULE: 'module',
  COMMONJS: 'commonjs'
};

const assetsToCache = ['js', 'css', 'html', 'json', 'png', 'jpeg', 'jpg', 'ico', 'webp', 'avif', 'svg', 'woff2'];

const ENVIRONMENT_VARIABLE_RE = /^\${(.+)}$/;

const require = createRequire(import.meta.url);

export default class Configuration {
  static #instance;
  static #names = ['postdoc.config.mjs', 'postdoc.config.cjs', 'postdoc.config.js', 'postdoc.json'];

  static async initialise(environment) {
    config({ debug: Boolean(environment.DEBUG) });

    const configuration = new Configuration(environment);

    const userConfiguration = await configuration.#resolveUserConfiguration();

    if (userConfiguration) {
      configuration.#walkAndInjectEnvironmentVariables(environment, userConfiguration);

      if (userConfiguration.pwa?.workbox?.globPatterns) {
        configuration.pwa.workbox.globPatterns = [];
      }
    }

    this.#instance = userConfiguration ? deepmerge(configuration, userConfiguration) : configuration;
  }

  static get() {
    if (!this.#instance) {
      throw new Error('Configuration is not initialised yet.');
    }

    return this.#instance;
  }

  #isModuleEnvironmentInPackage;

  vite = {
    publicDir: './src/public',
    logLevel: 'info'
  }

  session = {
    disable_spa: false,
    enable_prefetch: false
  }

  pwa = {
    enabled: false,
    strategies: 'generateSW',
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: [`**/*.{${assetsToCache.join(',')}}`]
    }
  };

  remote = {
    browser: 'chrome',
    configurations: {
      iphone15: {
        os: 'iOS',
        os_version: '17.3',
        device_browser: 'safari',
        device: 'iPhone+15'
      },
      iphone14: {
        os: 'iOS',
        os_version: '16.0',
        device_browser: 'safari',
        device: 'iPhone+14'
      },
      galaxyS23: {
        os: 'android',
        os_version: '13.0',
        device_browser: 'chrome',
        device: 'Samsung+Galaxy+S23'
      },
      windows10: {
        os: 'Windows',
        os_version: '10',
        device_browser: 'chrome',
        browser_version: '121.0'
      },
      windows11: {
        os: 'Windows',
        os_version: '11',
        device_browser: 'edge'
      }
    },
    localOptions: {
      proxy: false
    }
  };

  directories = {
    content: 'docs',
    tests: 'test',
    output: 'out',
    layouts: 'pages',
    includes: 'includes'
  };

  apidocs = {
    tags: {}, source: null, layout: 'apidocs.ejs',

    createUrl(filePath) {
      return filePath.split(sep).join('/').replace(/\.js$/, '.html');
    }
  };

  ignore = {
    pages: [],
    apidocs: [
      '**/node_modules/**/*',
      '**/node_modules/**/.*',
      '**/test/**/*'
    ],
    layouts: []
  };

  logger = {
    quiet: false,
    verbose: false
  };

  nightwatch = {
    headless: true,
    browser: 'chrome',
    watch: false
  };

  appSettings = {};

  markdown = {
    options: { async: true },
    extensions: [],
    shikiOptions: {}
  };

  constructor(environment) {
    this.logger.noColors = Boolean(environment.NO_COLOR);

    const packageDefinitionFilePath = resolve('package.json');
    const {
      name = '',
      type = EnvironmentType.COMMONJS
    } = existsSync(packageDefinitionFilePath) ? require(packageDefinitionFilePath) : {};

    this.appSettings.name = name;
    this.#isModuleEnvironmentInPackage = type === EnvironmentType.MODULE;
  }

  async #resolveUserConfiguration() {
    for (const configurationFileName of Configuration.#names) {
      const configurationFilePath = resolve(configurationFileName);

      const existConfigurationFile = existsSync(configurationFilePath);

      if (existConfigurationFile) {
        const isESMConfiguration = configurationFileName.endsWith('.mjs') || (configurationFileName.endsWith('.js') && this.#isModuleEnvironmentInPackage);
        const maybeUserConfiguration = isESMConfiguration ? await import(pathToFileURL(configurationFilePath).toString()).then((module) => module.default) : require(configurationFilePath);

        return typeof maybeUserConfiguration === 'object' ? maybeUserConfiguration : await Promise.resolve(maybeUserConfiguration());
      }
    }
  }

  #walkAndInjectEnvironmentVariables(environment, userConfiguration) {
    for (const property in userConfiguration) {
      const value = userConfiguration[property];

      if (typeof value === 'object') {
        this.#walkAndInjectEnvironmentVariables(environment, value);
      } else if (typeof value === 'string') {
        const [, environmentVariableName] = ENVIRONMENT_VARIABLE_RE.exec(value) ?? [];

        if (environmentVariableName) {
          userConfiguration[property] = environment[environmentVariableName];
        }
      }
    }
  }
}
