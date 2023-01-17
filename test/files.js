import {EventEmitter} from 'node:events';
import {ok, throws, strictEqual, doesNotThrow} from 'node:assert';

import mock from 'mock-fs';
import {describe, it, beforeEach, afterEach} from 'mocha';

import {File, Directory} from '../lib/files.js';

describe('The "files" abstraction over the Node\'s "fs" module', function () {
  beforeEach(function () {
    mock({
      'existed-file.md': 'content',
      inner: {
        'inner-file.md': 'inner content'
      },
      toMove: {}
    });
  });

  describe('File', function () {
    it('should be a plain function', function () {
      strictEqual(typeof File, 'function');
    });

    it('should return an object', function () {
      strictEqual(typeof File(), 'object');
    });

    it('should accept a "source" path while creating an instance', function () {
      strictEqual(File().source(), null);
      strictEqual(File('foo').source(), 'foo');
    });

    it('should accept content transformers in the chainable way', function () {
      const file = File();

      ok(file.map);

      const self = file.map(() => {});

      strictEqual(file, self);
    });

    describe('.exists', function () {
      it('should return "false" if the source path is not provided', function () {
        ok(!File().exists());
      });

      it('should return "false" if the file does not exists at the source path', function () {
        ok(!File('not-exists.md').exists());
      });

      it('should return "true" if the file exists at the source path', function () {
        ok(File('existed-file.md').exists());
      });
    });

    describe('.content', function () {
      it('should return the "Promise"', function () {
        const content = File('existed-file.md').content();

        ok(content instanceof Promise);
      });

      it('should asynchronously return the content of the file at the source path', async function () {
        const content = await File('existed-file.md').content();

        ok(content);
        strictEqual(content, 'content');
      });

      it('should reject if the file at the source path does not exist', async function () {
        try {
          await File('not-exist.md').content();
        } catch (error) {
          ok(error);
        }
      });

      it('should return a mapped content when at least one transformer is provided', async function () {
        const content = await File('existed-file.md')
          .map((content) => content + '!')
          .content();

        strictEqual(content, 'content!');
      });

      it('should return a content from a transformers if file does not exist', async function () {
        const content = await File('file-not-exists.md')
          .map(() => '')
          .map((content) => content + '!')
          .content();

        strictEqual(content, '!');
      });
    });

    describe('.write', function () {
      it('should throw if write is called on the file with no source', async function () {
        try {
          await File().write();
        } catch (error) {
          ok(error);
        }
      });

      it('should rewrite the current file if the "to" argument is omitted', async function () {
        const file = File('write-blah');

        ok(!file.exists());

        await file.write();

        ok(file.exists());
      });

      it('should write to another file if the "to" argument is present', async function () {
        const file = File('write-blah2');

        ok(!file.exists());

        await file.write('write-blah3');

        ok(!file.exists());

        ok(File('write-blah3').exists());
      });

      it('should return the same object after rewriting itself', async function () {
        const file = File('write-foo');

        const file2 = await file.write();

        strictEqual(file, file2);
      });

      it('should return a new object after writing to another path', async function () {
        const file = File('write-foo2');

        const file2 = await file.write('write-foo3');

        ok(file !== file2);
      });

      it('should write a changed content if there is at least one transformer', async function () {
        const copiedFile = await File('existed-file.md')
          .map((content) => 'pre-' + content)
          .write('copied-file.md');

        strictEqual(await copiedFile.content(), 'pre-content');
      });
    });

    describe('.watch', function () {
      let watcher = null;

      afterEach(function () {
        watcher && watcher.close();
        watcher = null;
      });

      it('should throw an error if a file does not have a "source" path', function () {
        throws(() => (watcher = File().watch()));
      });

      it('should return the "FSWatcher" instance', function () {
        watcher = File('existed-file.md').watch();

        ok(watcher instanceof EventEmitter);
      });
    });

    describe('.remove', function () {
      it('should reject if a file does not have a "source" path', async function () {
        try {
          await File().remove();
        } catch (error) {
          ok(error);
        }
      });

      it('should reject if a file at the "source" path does not exist', async function () {
        try {
          await File('blah.md').remove();
        } catch (error) {
          ok(error);
        }
      });

      it('should remove a file if it exists at the "source" path', async function () {
        const file = File('copied-file.md');

        await file.write();

        await file.remove();

        ok(!file.exists());
      });
    });
  });

  describe('Directory', function () {
    it('should be a plain function', function () {
      ok(typeof Directory === 'function');
    });

    it('should return an object', function () {
      ok(typeof Directory() === 'object');
    });

    it('should have no "source" path, by default', function () {
      const directory = Directory();

      strictEqual(directory.source(), null);

      const directory2 = Directory('foo');

      strictEqual(directory2.source(), 'foo');
    });

    it('should be able to make a directory "recursive"', function () {
      const directory = Directory();

      ok(directory.recursive);
    });

    describe('.recursive', function () {
      it('should return the directory\'s link', function () {
        const directory = Directory();

        strictEqual(directory.recursive(false), directory);
      });
    });

    describe('.files', function () {
      it('should throw if a directory has not a "source" path', function () {
        throws(Directory().files);
      });

      it('should return an array', function () {
        ok(Array.isArray(Directory('').files()));
      });

      it('should throw an error while attempting to return files of the non-existent directory', function () {
        throws(() => Directory('does-not-exist').files());
      });

      it('should return only direct files, by default', function () {
        const files = Directory('.').files();

        strictEqual(files.length, 1);
        ok(
          files.map(({source}) => source()).every((path) => !path.includes('inner-file.md'))
        );
      });

      it('should return files from inner directories if the "recursive" option is set to "true"', function () {
        const files = Directory('').recursive(true).files();

        strictEqual(files.length, 2);
        ok(
          files.map(({source}) => source()).some((path) => path.includes('inner-file.md'))
        );
      });
    });

    describe('.watch', function () {
      let watcher = null;

      afterEach(function () {
        watcher && watcher.close();
        watcher = null;
      });

      it('should throw an error if a directory does not have a "source" path', function () {
        throws(() => (watcher = Directory().watch()));
      });

      it('should return the "FSWatcher" instance', function () {
        watcher = Directory('.').watch();

        ok(watcher instanceof EventEmitter);
      });
    });

    describe('.move', function () {
      it('should rejects when the "source" and/or the "destination" paths are not set', async function () {
        try {
          await Directory('toMove').moveTo();
        } catch (error) {
          ok(error);
        }

        try {
          await Directory().moveTo('toMoveCopy');
        } catch (error) {
          ok(error);
        }

        try {
          await Directory().moveTo();
        } catch (error) {
          ok(error);
        }
      });

      it('should move the directory from the "source" path to the "destination" path', async function () {
        await Directory('toMove').moveTo('toMoveCopy');

        const files = Directory('toMoveCopy').files();

        // Moved directory exists.
        ok(Array.isArray(files));
        ok(files.length === 0);

        // Moved directory does not exist.
        throws(() => Directory('toMove').files());
      });

      it('should return the Directory instance', async function () {
        const directory = Directory('toMoveCopy');

        await directory.create();

        const movedDirectory = await directory.moveTo('toMove');

        strictEqual(directory, movedDirectory);
        strictEqual(directory.source(), 'toMove');
      });
    });

    describe('.create', function () {
      it('should reject if the "source" path is not defined', async function () {
        try {
          await Directory().create();
        } catch (error) {
          ok(error);
        }
      });

      it('should create a directory', async function () {
        await Directory('new-directory').create();

        doesNotThrow(() => Directory('new-directory').files());
      });

      it('should return the Directory instance', async function () {
        const directory = Directory(
          'single-non-existent-directory'
        );
        const createdDirectory = await directory.create();

        strictEqual(directory, createdDirectory);
      });

      it('should recursively create directories', async function () {
        await Directory('deep/recursive/directory').create();

        doesNotThrow(() => Directory('deep').files());
        doesNotThrow(() => Directory('deep/recursive').files());
        doesNotThrow(() =>
          Directory('deep/recursive/directory').files()
        );
      });

      it('should not reject if there is a directory already', async function () {
        await Directory('toMove').create();
      });
    });

    describe('.remove', function () {
      it('should reject if the "source" path is not defined', async function () {
        try {
          await Directory().remove();
        } catch (error) {
          ok(error);
        }
      });

      it('should remove a directory at the "source" path', async function () {
        const directory = Directory(
          'single-non-existent-directory'
        );

        await directory.create();

        await directory.remove();

        throws(() => directory.files());
      });

      it('should reject while removing non-existent directory', async function () {
        try {
          await Directory('blah-foo').remove();
        } catch (error) {
          ok(error);
        }
      });

      it('should remove nested directories', async function () {
        const directory = Directory('deep/recursive/directory');

        await directory.create();

        await Directory('deep').remove();

        throws(() => Directory('deep/recursive/directory').files());
      });
    });
  });

  afterEach(function () {
    mock.restore();
  });
});
