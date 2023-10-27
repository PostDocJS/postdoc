import { rm } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { basename, resolve } from "node:path";

import Future from "@halo-lab/future";
import picomatch from "picomatch";
import AsyncIterable from "@halo-lab/iterable/async";

import Page from "./page.js";
import Logger from "./logger.js";
import Configuration from "./configuration.js";
import { walkDirectory } from "./fs.js";

export default class Collector {
  #pages = [];
  #configuration = Configuration.get();
  #temporaryOutputDirectoryPath;
  #isTemporaryOutputDirectoryPathVirtual;

  constructor(isVirtualTemporaryOutputDirectory) {
    this.#isTemporaryOutputDirectoryPathVirtual =
      isVirtualTemporaryOutputDirectory;

    const temporaryOutputDirectoryPathPrefix = resolve(
      this.#configuration.directories.output,
      "..",
      ".pd-tmp-",
    );

    this.#temporaryOutputDirectoryPath = isVirtualTemporaryOutputDirectory
      ? temporaryOutputDirectoryPathPrefix
      : mkdtempSync(temporaryOutputDirectoryPathPrefix);
  }

  get pages() {
    return this.#pages;
  }

  get temporaryOutputDirectoryPath() {
    return this.#temporaryOutputDirectoryPath;
  }

  async collectPages() {
    const shouldIgnore = picomatch(this.#configuration.ignore.pages);

    const directoryDescriptor = walkDirectory(
      resolve(this.#configuration.directories.pages),
    );

    const nonIgnoredPages = AsyncIterable.filter(
      directoryDescriptor.files,
      (filePath) => !shouldIgnore(filePath),
    );

    this.#pages = await AsyncIterable.fold(
      nonIgnoredPages,
      [],
      (pages, filePath) => {
        try {
          pages.push(
            new Page(filePath, basename(this.#temporaryOutputDirectoryPath)),
          );
        } catch (error) {
          Logger.log(
            (typography) => `
					The following content file does not have a corresponding layout: ${typography.dim(
            filePath,
          )}.
						Please add at least a default one ${typography.bold(
              resolve(this.#configuration.directories.layouts, "index.ejs"),
            )}.
				`,
            Logger.ErrorLevel,
          );
        }

        return pages;
      },
    );
  }

  async writePages() {
    await Future.merge(
      this.#pages.map((page) => page.compileAndWrite(this.#pages)),
    );
  }

  async clear() {
    if (!this.#isTemporaryOutputDirectoryPathVirtual) {
      await rm(this.#temporaryOutputDirectoryPath, { recursive: true });
    }
  }
}
