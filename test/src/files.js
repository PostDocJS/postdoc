import fs from "fs-extra";
import os from "os";
import path from "path";
import { File, Directory } from "../../lib/files.js";
import EventEmitter from "node:events";

describe('The "files" abstraction over the Node\'s "fs" module', function () {
  let tmpDir;

  beforeEach(async function (client, done) {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-files"));
    await fs.writeFile(path.join(tmpDir, "existed-file.md"), "content");
    await fs.mkdir(path.join(tmpDir, "inner"));
    await fs.writeFile(
      path.join(tmpDir, "inner", "inner-file.md"),
      "inner content",
    );
    await fs.mkdir(path.join(tmpDir, "toMove"));
    done();
  });

  afterEach(async function (client, done) {
    await fs.remove(tmpDir);
    done();
  });

  describe("File", async function () {
    it("should be a plain function", function (client) {
      client.assert.equal(typeof File, "function");
    });

    it("should return an object", async function (client) {
      client.assert.equal(typeof File(), "object");
    });

    it('should accept a "source" path while creating an instance', async function (client) {
      client.assert.equal(File().source(), null);
      client.assert.equal(File("foo").source(), "foo");
    });
    it("should accept content transformers in the chainable way", async function (client) {
      const file = File();
      client.assert.ok(file.map);
      const self = file.map(() => {});
      client.assert.equal(file, self);
    });
  });
  describe("Directory", function () {
    it("should be a plain function", function (client) {
      client.assert.equal(typeof Directory, "function");
    });

    it("should return an object", function (client) {
      client.assert.equal(typeof Directory(), "object");
    });

    it('should have no "source" path, by default', async function (client) {
      const directory = Directory();
      client.assert.strictEqual(directory.source(), null);

      const directory2 = Directory("foo");
      client.assert.strictEqual(directory2.source(), "foo");
    });

    it('should be able to make a directory "recursive"', function (client) {
      const directory = Directory();
      client.assert.ok(directory.recursive);
    });

    describe(".recursive", function () {
      it("should return the directory's link", function (client) {
        const directory = Directory();
        client.assert.strictEqual(directory.recursive(false), directory);
      });
    });
    describe(".files", function () {
      it('should throw if a directory has not a "source" path', async function (client) {
        client.assert.throws(Directory().files);
      });

      it("should return an array", async function (client) {
        client.assert.ok(Array.isArray(Directory(path.join(tmpDir)).files()));
      });

      it("should throw an error while attempting to return files of the non-existent directory", async function (client) {
        client.assert.throws(() => Directory("does-not-exist").files());
      });

      it("should return only direct files, by default", async function (client) {
        const files = Directory(path.join(tmpDir)).files();
        client.assert.strictEqual(files.length, 1);
        client.assert.ok(
          files
            .map(({ source }) => source())
            .every((path) => !path.includes("inner-file.md")),
        );
      });

      it('should return files from inner directories if the "recursive" option is set to "true"', async function (client) {
        const files = Directory(path.join(tmpDir)).recursive(true).files();
        client.assert.strictEqual(files.length, 2);
        client.assert.ok(
          files
            .map(({ source }) => source())
            .some((path) => path.includes("inner-file.md")),
        );
      });
    });
    describe(".exists", function () {
      it("should return true if directory exists", async function (client) {
        client.assert.ok(Directory(path.join(tmpDir, "inner")).exists());
      });

      it("should return false if directory does not exist", async function (client) {
        client.assert.ok(!Directory("unknown-directory").exists());
      });
    });

    describe(".directories", function () {
      it("should return a list of directories only", async function (client) {
        const dirs = Directory(path.join(tmpDir)).directories();
        client.assert.strictEqual(dirs.length, 2);
        client.assert.strictEqual(path.basename(dirs[0].source()), "inner");
        client.assert.strictEqual(path.basename(dirs[1].source()), "toMove");
      });
    });

    describe(".watch", function () {
      let watcher = null;

      afterEach(async function (client, done) {
        watcher && watcher.close();
        watcher = null;
        done();
      });

      it('should throw an error if a directory does not have a "source" path', async function (client) {
        client.assert.throws(() => (watcher = Directory().watch()));
      });

      it('should return the "FSWatcher" instance', async function (client) {
        watcher = Directory(path.join(tmpDir)).watch();
        client.assert.ok(watcher instanceof EventEmitter);
      });
    });

    describe(".move", function () {
      it('should reject when the "source" and/or the "destination" paths are not set', async function (client) {
        try {
          await Directory(path.join(tmpDir, "toMove")).moveTo();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }

        try {
          await Directory().moveTo(path.join(tmpDir, "toMoveCopy"));
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }

        try {
          await Directory().moveTo();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }
      });

      it('should move the directory from the "source" path to the "destination" path', async function (client) {
        await Directory(path.join(tmpDir, "toMove")).moveTo(
          path.join(tmpDir, "toMoveCopy"),
        );

        const files = Directory(path.join(tmpDir, "toMoveCopy")).files();

        // Moved directory exists.
        client.assert.ok(Array.isArray(files));
        client.assert.ok(files.length === 0);

        // Moved directory does not exist.
        try {
          Directory(path.join(tmpDir, "toMove")).files();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }
      });

      it("should return the Directory instance", async function (client) {
        const directory = Directory(path.join(tmpDir, "toMoveCopy"));

        await directory.create();

        const movedDirectory = await directory.moveTo(
          path.join(tmpDir, "toMove"),
        );

        client.assert.equal(directory, movedDirectory);
        client.assert.equal(directory.source(), path.join(tmpDir, "toMove"));
      });
    });

    describe(".create", function () {
      it('should reject if the "source" path is not defined', async function (client) {
        try {
          await Directory().create();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }
      });

      it("should create a directory", async function (client) {
        await Directory(path.join(tmpDir, "new-directory")).create();

        try {
          Directory(path.join(tmpDir, "new-directory")).files();
          client.assert.ok(true);
        } catch (error) {
          client.assert.fail("Unexpected error was thrown");
        }
      });

      it("should return the Directory instance", async function (client) {
        const directory = Directory(
          path.join(tmpDir, "single-non-existent-directory"),
        );
        const createdDirectory = await directory.create();

        client.assert.equal(directory, createdDirectory);
      });

      it("should recursively create directories", async function (client) {
        await Directory(path.join(tmpDir, "deep/recursive/directory")).create();

        try {
          Directory(path.join(tmpDir, "deep")).files();
          Directory(path.join(tmpDir, "deep/recursive")).files();
          Directory(path.join(tmpDir, "deep/recursive/directory")).files();
          const isExists = Directory(
            path.join(tmpDir, "deep/recursive/directory"),
          ).exists();
          client.assert.ok(isExists);
        } catch (error) {
          client.assert.fail("Unexpected error was thrown");
        }
      });

      it("should not reject if there is a directory already", async function (client) {
        try {
          await Directory(path.join(tmpDir, "toMove")).create();
          const isExists = Directory(path.join(tmpDir, "toMove")).exists();
          client.assert.ok(isExists);
        } catch (error) {
          client.assert.fail("Unexpected error was thrown");
        }
      });
    });

    describe(".remove", function () {
      it('should reject if the "source" path is not defined', async function (client) {
        try {
          await Directory().remove();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }
      });

      it('should remove a directory at the "source" path', async function (client) {
        const directory = Directory(
          path.join(tmpDir, "single-non-existent-directory"),
        );

        await directory.create();
        await directory.remove();

        try {
          directory.files();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }
      });

      it("should reject while removing non-existent directory", async function (client) {
        try {
          await Directory(path.join(tmpDir, "blah-foo")).remove();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }
      });

      it("should remove nested directories", async function (client) {
        const directory = Directory(
          path.join(tmpDir, "deep/recursive/directory"),
        );

        await directory.create();
        await Directory(path.join(tmpDir, "deep")).remove();

        try {
          Directory(path.join(tmpDir, "deep/recursive/directory")).files();
          client.assert.fail("Expected error was not thrown");
        } catch (error) {
          client.assert.ok(error);
        }
      });
    });
  });
});
