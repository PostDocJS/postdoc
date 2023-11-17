import { join } from "node:path";
import { opendir } from "node:fs/promises";

import AsyncIterable from "@halo-lab/iterable/async";

/**
 * Walks over giver directory and returns paths of all
 * files in it. If _recursive_ is `false`, then it takes
 * into account only direct files. By default, it recursively
 * walks over all inner directories.
 *
 * Returns a descriptor object with the `files` property as an
 * iterable. So no actual file system calls are not made until
 * this iterable is used. The descriptor object must be closed
 * after using iterable. If full iteration is made, then it
 * closes automatically.
 */
export function walkDirectory(path, recursive = true) {
  let isClosed = false;
  const openedInnerDirectories = [];

  const openDirectoryRequest = opendir(path);

  const files = AsyncIterable.from(async function* () {
    if (isClosed) {
      return;
    }

    const directory = await openDirectoryRequest;

    for await (const dirent of directory) {
      if (dirent.isFile()) {
        yield join(path, dirent.name);
      } else {
        if (recursive) {
          const descriptor = walkDirectory(join(path, dirent.name), recursive);

          openedInnerDirectories.push(descriptor);

          yield* descriptor.files;
        }
      }
    }
  });

  return {
    files,
    async close() {
      if (isClosed) {
        return;
      }

      const directory = await openDirectoryRequest;

      await directory.close();

      await Promise.all(
        openedInnerDirectories.map((descriptor) => descriptor.close()),
      );

      isClosed = true;
    },
  };
}
