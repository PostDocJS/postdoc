import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ok, equal } from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';

import AsyncIterable from '@halo-lab/iterable/async';

import { walkDirectory } from '../../../lib/fs.js';

describe('The FS walker', function () {
  let tmpDir;

  beforeEach(async function (done) {
    tmpDir = await mkdtemp(join(tmpdir(), 'test-files'));
    await writeFile(join(tmpDir, 'existed-file.md'), 'content', 'utf-8');
    await mkdir(join(tmpDir, 'inner'));
    await writeFile(
      join(tmpDir, 'inner', 'inner-file.md'),
      'inner content',
      'utf-8'
    );
    await mkdir(join(tmpDir, 'toMove'));
    done();
  });

  afterEach(async function (done) {
    await rm(tmpDir, { recursive: true });
    done();
  });

  test('walker should return iterable of files and close function', async function () {
    const { files, close } = walkDirectory(tmpDir);

    ok(Symbol.asyncIterator in files);
    ok(typeof close === 'function');
  });

  test('walker has to return all files inside a given folder', async function () {
    const { files } = walkDirectory(tmpDir);

    const filesAmount = await AsyncIterable.count(files);

    equal(filesAmount, 2);
  });

  test('walker should return nothing after being closed', async function () {
    const { files, close } = walkDirectory(tmpDir);

    await close();

    const filesAmount = await AsyncIterable.count(files);

    equal(filesAmount, 0);
  });

  test('walker should return only files of the provided directory if recursive parameter is false', async function () {
    const { files } = walkDirectory(tmpDir, false);

    const filesAmount = await AsyncIterable.count(files);

    equal(filesAmount, 1);
  });
});
