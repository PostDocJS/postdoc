/**
 * Every EJS file contains a basic set of global values.
 *
 * ## __filename, __dirname, require
 *
 * First of all, most used CommonJS variables are present:
 *
 * 1. **__filename** - contains an absolute path to the current EJS file.
 * 2. **__dirname** - contains an absolute path to the parent directory of the current EJS file.
 * 3. **require** - imports any CommonJS or JSON files relatively to the current EJS file.
 *
 * @example
 * <%
 * const someModule = require('../js/some-module.cjs');
 * %>
 * <div>
 *     <span>Current file is available at <%= __filename %></span>
 *     <span>Current directory is <%= __dirname %></span>
 *
 *     <span><%= `Some module says ${someModule.greet()}` %></span>
 * </div>
 *
 * ## _import
 *
 * To import ES module use **_import**.
 *
 * @example
 * <% const someModule = await _import('../js/some-module.mjs'); %>
 *
 * > Unfortunately, you cannot use native dynamic import expression because
 * > module won't be resolved correctly.
 *
 * ## url
 *
 * To correctly refer an asset from anywhere except the `public` directory,
 * use the `url` function that converts a relative path to the asset into URL.
 * Also, Vite is able to pick up, transform and rebase those assets.
 *
 * @example
 * <img src="<%= url('../assets/images/hero.png') %>" />
 *
 * ## page
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
 * @example
 * # <%= page.url %>
 * <%- page.content %>
 *
 * ## pages
 *
 * Contains a list of all available pages with its URLs.
 *
 * @example
 * <ul>
 *     <% for (const { url } of pages) { %>
 *         <li><%= url %></li>
 *     <% } %>
 * </ul>
 *
 * ## appSettings
 *
 * An object defined in the configuration file. It always contains
 * a name of the current project and other properties are entirely
 * custom.
 *
 * @example
 * The project is <%= appSettings.name %>
 */

import { cwd } from "node:process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, relative, resolve, sep } from "node:path";

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

    this.url = (path) => {
      const absolutePath = path.startsWith(".")
        ? resolve(dirname(layoutFilePath), path)
        : path.startsWith("~")
          ? path.replace("~", cwd())
          : path;

      return relative(dirname(outputPagePath), absolutePath)
        .split(sep)
        .join("/");
    };

    this.page = {
      ...additionalPageInformation,
      url: pageUrl,
    };

    this.pages = pages.map((page) => page.url);

    this.appSettings = Configuration.get().appSettings;
  }
}
