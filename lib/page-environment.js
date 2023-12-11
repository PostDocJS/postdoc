/**
 * Every EJS file contains a basic set of global values.
 *
 * <h2 id="commonjs-globals">__filename, __dirname, require</h2>
 *
 * First of all, most used CommonJS variables are present:
 *
 * 1. **__filename** - contains an absolute path to the current EJS file.
 * 2. **__dirname** - contains an absolute path to the parent directory of the current EJS file.
 * 3. **require** - imports any CommonJS or JSON files relatively to the current EJS file.
 *
 * ```ejs
 * <%
 * const someModule = require('../js/some-module.cjs');
 * %>
 * <div>
 *     <span>Current file is available at <%= __filename %></span>
 *     <span>Current directory is <%= __dirname %></span>
 *
 *     <span><%= `Some module says ${someModule.greet()}` %></span>
 * </div>
 * ```
 *
 * <h2 id="import">_import</h2>
 *
 * To import ES module use **_import**.
 *
 * ```ejs
 * <% const someModule = await _import('../js/some-module.mjs'); %>
 * ```
 *
 * > Unfortunately, you cannot use native dynamic import expression because
 * > module won't be resolved correctly.
 *
 * <h2 id="page">page</h2>
 *
 * This variable contains all information for the current page.
 * It has next properties:
 *
 * 1. `url` - current's page URL.
 * 2. `content` - if a page is created from the MD file, its compiled
 * content is saved to this property.
 * 3. all front-matter definitions - if a page is created from the MD file and
 * has a front-matter section, all definitions are available on the `page` variable.
 * 4. `commentsSourcePath` - if a page is created from the API page, it contains
 * an absolute path to the API page source file.
 * 5. `comments` - if a page is created from the API page, it contains an array
 * of parsed non-ignored JSDoc comments.
 *
 * ```ejs
 * # <%= page.url %>
 * <%- page.content %>
 * ```
 *
 * <h2 id="pages">pages</h2>
 *
 * Contains a list of all available pages with its URLs.
 *
 * ```ejs
 * <ul>
 *     <% for (const { url } of pages) { %>
 *         <li><%= url %></li>
 *     <% } %>
 * </ul>
 * ```
 *
 * <h2 id="app-settings">appSettings</h2>
 *
 * An object defined in the configuration file. It always contains
 * a name of the current project and other properties are entirely
 * custom.
 *
 * ```ejs
 * The project is <%= appSettings.name %>
 * ```
 *
 * @name page_environment
 */

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

import Configuration from "./configuration.js";

export default class PageEnvironment {
  constructor(
    layoutFilePath,
    pageUrl,
    outputPagePath,
    pages,
    additionalPageInformation = {},
  ) {
    this.__filename = layoutFilePath;
    this.__dirname = dirname(layoutFilePath);

    this.require = createRequire(pathToFileURL(layoutFilePath));

    this._import = (path) =>
      import(
        path.startsWith(".")
          ? pathToFileURL(resolve(dirname(layoutFilePath), path))
          : path
      );

    this.page = {
      ...additionalPageInformation,
      url: pageUrl,
    };

    this.pages = pages.map((page) => ({ url: page.url }));

    this.appSettings = Configuration.get().appSettings;
  }
}
