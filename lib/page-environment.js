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
