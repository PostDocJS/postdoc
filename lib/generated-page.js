import { existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve, sep } from 'node:path';

import Configuration from './configuration.js';

export default class GeneratedPage {
  static DEFAULT_CONTENT = `
---
draft: true
---

# Main header

> Intelligence is the ability to avoid doing work, yet getting the work done.
> - Linus Torvalds
`;

  #content;
  #outputFilePath;

  constructor(content, outputPath) {
    if (existsSync(outputPath)) {
      throw new Error('The page already exists.');
    }

    this.#content = content;
    this.#outputFilePath = outputPath;
  }

  get url() {
    const configuration = Configuration.get();

    return this.#outputFilePath
      .replace(resolve(configuration.directories.content), '')
      .replaceAll(sep, '/')
      .replace('.md', '.html');
  }

  get name() {
    const name = basename(this.#outputFilePath, extname(this.#outputFilePath));

    if (name === 'index') {
      if (this.url === '/index.html') {
        return name;
      }

      return basename(resolve(this.#outputFilePath, '..'));

    }

    return name;

  }

  get outputPath() {
    return this.#outputFilePath;
  }

  async write() {
    const outputPageDirectoryPath = dirname(this.#outputFilePath);

    if (!existsSync(outputPageDirectoryPath)) {
      await mkdir(outputPageDirectoryPath, { recursive: true });
    }

    await writeFile(this.#outputFilePath, this.#content, 'utf8');
  }

  async clearIfPresent() {
    if (existsSync(this.#outputFilePath)) {
      await unlink(this.#outputFilePath);
    }
  }
}
