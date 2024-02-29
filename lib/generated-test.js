import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';

import Configuration from './configuration.js';

export default class GeneratedTest {
  static DEFAULT_PAGE_OBJECT_CONTENT = `
export default {
  url: '{url}',
  elements: {
    header: {
      selector: 'h1'
    },
    quote: {
      selector: 'blockquote'
    }
  }
};
`.trim();

  #outputPageObjectContent;
  #outputPageObjectFilePath;

  get outputPath() {
    return this.#outputPageObjectFilePath;
  }

  constructor(page, pageObjectContent) {
    const configuration = Configuration.get();
    const rootTestsDirectory = resolve(configuration.directories.tests);

    this.#outputPageObjectFilePath = page.outputPath
      .replace(resolve(configuration.directories.content), rootTestsDirectory)
      .replace(extname(page.outputPath), '.js')

    if (existsSync(this.#outputPageObjectFilePath)) {
      throw new Error('The test already exists.');
    }

    this.#outputPageObjectContent = pageObjectContent.replaceAll(
      '{url}',
      page.url
    );
  }

  async write() {
    const outputPageObjectFileDirectoryPath = dirname(
      this.#outputPageObjectFilePath
    );

    if (!existsSync(outputPageObjectFileDirectoryPath)) {
      await mkdir(outputPageObjectFileDirectoryPath, { recursive: true });
    }

    await writeFile(
      this.#outputPageObjectFilePath,
      this.#outputPageObjectContent,
      'utf8'
    );
  }

  async clearIfPresent() {
    if (existsSync(this.#outputPageObjectFilePath)) {
      await unlink(this.#outputPageObjectFilePath);
    }
  }
}
