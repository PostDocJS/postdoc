const {
  ok,
  throws,
  rejects,
  strictEqual,
  doesNotReject,
  deepStrictEqual
} = require('assert');

const mock = require('mock-fs');
const {EventEmitter} = require('events');
const {describe, it, after, afterEach} = require('mocha');

const {File, Directory} = require('../lib/files.js');

describe('The "files" abstraction over the Node\'s "fs" module', function () {
  before(function () {
    mock({
      'existed-file.md': 'content',
      inner: {
        'inner-file.md': 'inner content'
      }
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
      it('should return a "Promise"', function () {
        const content = File().setSource('existed-file.md').content();

        ok(content instanceof Promise);
      });

      it('should asyncronously return the content of the file at the source path', async function () {
        const content = File().setSource('existed-file.md').content();

        await doesNotReject(() => content);

        strictEqual(await content, 'content');
      });

      it('should reject if the file at the source path does not exist', function () {
        rejects(File().setSource('not-exist.md').content);
      });

      it('should return a mapped content when at least one transformer is provided', async function () {
        const content = await File()
          .setSource('existed-file.md')
          .map((content) => content + '!')
          .content();

        strictEqual(content, 'content!');
      });
    });

    describe('.write', function () {
      it('should return a "Promise"', function () {
        const result = File().write();

        ok(result instanceof Promise);
      });

      it('should reject if no "destination" path is provided and the destination file existence is ignored', async function () {
        await rejects(() => File().write({ignore: false}));
      });

      it('should reject if no "destination" path is provided and the destination file existence is not ignored', async function () {
        await rejects(() => File().write({ignore: false}));
      });

      it('should rejects if "destination" path is not provided and the destination file existence is not ignored', async function () {
        await rejects(() => File().write({ignore: false}));
      });

      it('should return "false" if "destination" path is provided and the destination file existence is not ignored', async function () {
        const result = await File()
          .setDestination('existed-file.md')
          .write({ignore: false});

        ok(!result);
      });

      it('should write a content from the file at the "source" path to the "destination" path if the there is no file at the "destination"', async function () {
        const file = File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md');

        const result = await file.write({ignore: false});

        ok(result);

        const newFile = File().setSource('copied-file.md');

        ok(file.exists());

        strictEqual(await newFile.content(), 'content');
      });

      it('should return "false" and not write a file to the "destination" path if there is a file already and the "ignore" option is "false"', async function () {
        const result = await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .write({ignore: false});

        ok(!result);

        strictEqual(
          await File().setSource('copied-file.md').content(),
          'content'
        );
      });

      it('should rewrite the file if the "ignore" option is not set', async function () {
        const result = await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .map((content) => content + ' changed!')
          .write();

        ok(result);

        strictEqual(
          await File().setSource('copied-file.md').content(),
          'content changed!'
        );
      });

      it('should write a changed content if there is at least one transformer', async function () {
        await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .map((content) => 'pre-' + content)
          .write();

        strictEqual(
          await File().setSource('copied-file.md').content(),
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
        await rejects(() => File().remove());
      });

      it('should reject if a file at the "source" path does not exist', async function () {
        await rejects(() => File().setSource('blah.md').remove());
      });

      it('should remove a file if it exists at the "source" path', async function () {
        const file = File().setSource('copied-file.md');

        await doesNotReject(() => file.remove());

        ok(!file.exists());
      });

      after(async function () {
        await File()
          .setSource('existed-file.md')
          .setDestination('copied-file.md')
          .write();
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

    describe('files', function () {
      it('should throws if directory has not a "source" path', function () {
        throws(Directory().files);
      });

      it('should return an array', function () {
        ok(Directory().setSource('').files() instanceof Array);
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
  });

  after(function () {
    mock.restore();
  });
});
