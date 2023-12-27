import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';

import Configuration from './configuration.js';

export default class GeneratedTest {
  static DEFAULT_CONTENT = `
describe("{pageName}", function () {
  test("heading and quote should be visible", function (browser) {
    const {pageName} = browser.page.{pagePathParts}();

    {pageName}
      .navigate()
      .assert.visible("@header")
      .assert.visible("@quote");

    browser.end();
  });
});
`.trim();

  static DEFAULT_PAGE_OBJECT_CONTENT = `
module.exports = {
  url: "{url}",
  elements: {
    header: {
      selector: "h1"
    },
    quote: {
      selector: "blockquote"
    }
  }
};
`.trim();

  #outputMainContent;
  #outputMainFilePath;
  #outputPageObjectContent;
  #outputPageObjectFilePath;

  constructor(page, mainTestContent, pageObjectContent) {
    const configuration = Configuration.get();
    const rootTestsDirectory = resolve(configuration.directories.tests);
    const pageObjectsDirectoryPath = join(rootTestsDirectory, 'page-objects');

    this.#outputMainFilePath = page.outputPath
      .replace(
        resolve(configuration.directories.content),
        join(rootTestsDirectory, 'src')
      )
      .replace(extname(page.outputPath), '.js');
    this.#outputPageObjectFilePath = this.#outputMainFilePath
      .replace(join(rootTestsDirectory, 'src'), pageObjectsDirectoryPath)
      .replace('.js', '.cjs');

    if (existsSync(this.#outputMainFilePath)) {
      throw new Error('The test already exists.');
    }

    if (existsSync(this.#outputPageObjectFilePath)) {
      throw new Error('The page object already exists.');
    }

    this.#outputMainContent = mainTestContent
      .replaceAll('{pageName}', page.name)
      .replaceAll(
        '{pagePathParts}',
        this.#outputPageObjectFilePath
          .replace(pageObjectsDirectoryPath + sep, '')
          .replace('.cjs', '')
          .split(sep)
          .join('.')
      );
    this.#outputPageObjectContent = pageObjectContent.replaceAll(
      '{url}',
      page.url
    );
  }

  async write() {
    const outputMainFileDirectoryPath = dirname(this.#outputMainFilePath);
    const outputPageObjectFileDirectoryPath = dirname(
      this.#outputPageObjectFilePath
    );

    if (!existsSync(outputMainFileDirectoryPath)) {
      await mkdir(outputMainFileDirectoryPath, { recursive: true });
    }

    if (!existsSync(outputPageObjectFileDirectoryPath)) {
      await mkdir(outputPageObjectFileDirectoryPath, { recursive: true });
    }

    await writeFile(this.#outputMainFilePath, this.#outputMainContent, 'utf8');
    await writeFile(
      this.#outputPageObjectFilePath,
      this.#outputPageObjectContent,
      'utf8'
    );
  }

  async clearIfPresent() {
    if (existsSync(this.#outputMainFilePath)) {
      await unlink(this.#outputMainFilePath);
    }
  }
}
