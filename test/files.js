const {EventEmitter} = require('events');
const {
  ok,
  throws,
  rejects,
  strictEqual,
  doesNotThrow,
  doesNotReject,
  deepStrictEqual
} = require('assert');

const mock = require('mock-fs');
const {describe, it, after, afterEach} = require('mocha');

const {isFuture} = require('../lib/utils/future.js');
const {File, Directory} = require('../lib/files.js');

describe('The "files" abstraction over the Node\'s "fs" module', function () {
  before(function () {
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

    it('should have no "source" and "destination" paths after creating an instance', function () {
      const file = File();

      strictEqual(file.source(), null);
      strictEqual(file.destination(), null);
    });

    it('should return the self from the "setSource" and "setDestination" methods', function () {
      const file = File();

      ok(file.setSource);
      ok(file.setDestination);

      strictEqual(file, file.setSource(''));
      strictEqual(file, file.setDestination(''));
    });

    it('should save "source" and "destination" paths after providing them', function () {
      const file = File().setSource('source').setDestination('destination');
      strictEqual(file.source(), 'source');
      strictEqual(file.destination(), 'destination');
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
        ok(!File().setSource('not-exists.md').exists());
      });

      it('should return "true" if the file exists at the source path', function () {
        ok(File().setSource('existed-file.md').exists());
      });
    });

    describe('.content', function () {
      it('should return a "Future"', function () {
        const content = File().setSource('existed-file.md').content();

        ok(isFuture(content));
      });

      it('should asynchronously return the content of the file at the source path', async function () {
        const content = await File().setSource('existed-file.md').content().run();

        ok(content.isOk());
        strictEqual(content.extract(() => ''), 'content');
      });

      it('should reject if the file at the source path does not exist', async function () {
        const result = await File().setSource('not-exist.md').content().run();

        ok(result.isErr());
      });

      it('should return a mapped content when at least one transformer is provided', async function () {
        const content = await File()
          .setSource('existed-file.md')
          .map((content) => content + '!')
          .content()
          .run();

        strictEqual(content.extract(() => ''), 'content!');
      });
    });

    describe('.write', function () {
      it('should return a "Future"', function () {
        const result = File().write();

        ok(isFuture(result));
      });

      it('should reject if no "destination" path is provided and the destination file existence is ignored', async function () {
        const result = await File().write({ignore: true}).run();

        ok(result.isErr());
      });

      it('should reject if no "destination" path is provided and the destination file existence is not ignored', async function () {
        const result = await File().write({ignore: false}).run();

        ok(result.isErr());
      });

      it('should fail if the "destination" path is provided and the destination file existence is not ignored', async function () {
        const result = await File()
          .setDestination('existed-file.md')
          .write({ignore: false})
          .run();

        ok(result.isErr());
      });

      it('should write a content from the file at the "source" path to the "destination" path if the there is no file at the "destination"', async function () {
        const file = File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md');

        const result = await file.write({ignore: false}).run();

        ok(result.isOk());

        const newFile = File().setSource('copied-file.md');

        ok(file.exists());

        strictEqual((await newFile.content().run()).extract(() => ''), 'content');
      });

      it('should fail and not write a file to the "destination" path if there is a file already and the "ignore" option is "false"', async function () {
        const result = await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .write({ignore: false})
          .run();

        ok(result.isErr());

        strictEqual(
          (await File().setSource('copied-file.md').content().run()).extract(() => ''),
          'content'
        );
      });

      it('should rewrite the file if the "ignore" option is not set', async function () {
        const result = await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .map((content) => content + ' changed!')
          .write()
          .run();

        ok(result.isOk());

        strictEqual(
          (await File().setSource('copied-file.md').content().run()).extract(() => ''),
          'content changed!'
        );
      });

      it('should write a changed content if there is at least one transformer', async function () {
        await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .map((content) => 'pre-' + content)
          .write()
          .run();

        strictEqual(
          (await File().setSource('copied-file.md').content().run()).extract(() => ''),
          'pre-content'
        );
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
        watcher = File().setSource('existed-file.md').watch();

        ok(watcher instanceof EventEmitter);
      });
    });

    describe('.remove', function () {
      it('should reject if a file does not have a "source" path', async function () {
        const result = await File().remove().run();

        ok(result.isErr());
      });

      it('should reject if a file at the "source" path does not exist', async function () {
        const result = await File().setSource('blah.md').remove().run();

        ok(result.isErr());
      });

      it('should remove a file if it exists at the "source" path', async function () {
        const file = File().setSource('copied-file.md')

        const result = await file.remove().run();

        ok(result.isOk());
        ok(!file.exists());
      });

      after(async function () {
        await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .write()
          .run();
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

      ok(directory.source);
      strictEqual(directory.source(), null);
    });

    it('should return a "source" path after declaring it', function () {
      const directory = Directory();

      directory.setSource('some');

      strictEqual(directory.source(), 'some');
    });

    it('should be able to make a directory "recursive"', function () {
      const directory = Directory();

      ok(directory.recursive);
    });

    describe('.setSource', function () {
      it("should return the directory's link", function () {
        const directory = Directory();

        strictEqual(directory.setSource(''), directory);
      });
    });

    describe('.recursive', function () {
      it("should return the directory's link", function () {
        const directory = Directory();

        strictEqual(directory.recursive(false), directory);
      });
    });

    describe('.files', function () {
      it('should throws if directory has not a "source" path', function () {
        throws(Directory().files);
      });

      it('should return an array', function () {
        ok(Directory().setSource('').files() instanceof Array);
      });

      it('should throw an error while attempting to return files of the non-existent directory', function () {
        throws(() => Directory().setSource('does-not-exist').files());
      });

      it('should return only direct files, by default', function () {
        const files = Directory().setSource('').files();

        strictEqual(files.length, 2);
        deepStrictEqual(
          files.map(({source}) => source()),
          ['copied-file.md', 'existed-file.md']
        );
      });

      it('should return files from inner directories if the "recursive" option is set to "true"', function () {
        const files = Directory().setSource('').recursive(true).files();

        strictEqual(files.length, 3);
        deepStrictEqual(
          files.map(({source}) => source()),
          ['copied-file.md', 'existed-file.md', 'inner/inner-file.md']
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
        watcher = Directory().setSource('').watch();

        ok(watcher instanceof EventEmitter);
      });
    });

    describe('.move', function () {
      it('should rejects when the "source" and/or the "destination" paths are not set', async function () {
        ok((await Directory().setSource('toMove').move().run()).isErr());
        ok((await Directory().move('toMoveCopy').run()).isErr());
        ok((await Directory().move().run()).isErr());
      });

      it('should move the directory from the "source" path to the "destination" path', async function () {
        await Directory().setSource('toMove').move('toMoveCopy').run();

        const files = Directory().setSource('toMoveCopy').files();

        // Moved directory exists.
        ok(files instanceof Array);
        ok(files.length === 0);

        // Moved directory does not exist.
        throws(() => Directory().setSource('toMove').files());
      });

      it('should return the Directory instance', async function () {
        const directory = Directory().setSource('toMoveCopy');
        const movedDirectory = await directory.move('toMove').run();

        strictEqual(directory, movedDirectory.extract(() => null));
        strictEqual(directory.source(), 'toMove');
      });
    });

    describe('.create', function () {
      it('should reject if the "source" path is not defined', async function () {
        ok((await Directory().create().run()).isErr());
      });

      it('should create a directory', async function () {
        await Directory().setSource('new-directory').create().run();

        doesNotThrow(() => Directory().setSource('new-directory').files());
      });

      it('should return the Directory instance', async function () {
        const directory = Directory().setSource(
          'single-non-existent-directory'
        );
        const createdDirectory = await directory.create().run();

        strictEqual(directory, createdDirectory.extract(() => null));
      });

      it('should recursively create directories', async function () {
        await Directory().setSource('deep/recursive/directory').create().run();

        doesNotThrow(() => Directory().setSource('deep').files());
        doesNotThrow(() => Directory().setSource('deep/recursive').files());
        doesNotThrow(() =>
          Directory().setSource('deep/recursive/directory').files()
        );
      });

      it('should not reject if there is a directory already', async function () {
        ok((await Directory().setSource('deep').create().run()).isOk());
      });
    });

    describe('.remove', function () {
      it('should reject if the "source" path is not defined', async function () {
        ok((await Directory().remove().run()).isErr());
      });

      it('should remove a directory at the "source" path', async function () {
        const directory = Directory().setSource(
          'single-non-existent-directory'
        );

        const result = await directory.remove().run();

        ok(result.isOk());

        throws(() => directory.files());
      });

      it('should not reject while removing non-existent directory', async function () {
        ok((await Directory().setSource('blah').remove().run()).isOk());
      });

      it('should remove nested directories also', async function () {
        ok(
          (await Directory().setSource('deep/recursive').remove().run())
            .isOk()
        );

        throws(() => Directory().setSource('deep/recursive/directory').files());
      });
    });
  });

  after(function () {
    mock.restore();
  });
});
