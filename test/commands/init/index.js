// import {tmpdir} from 'node:os';
// import {spawnSync} from 'node:child_process';
// import {join, resolve} from 'node:path';
// import {ok, strictEqual} from 'node:assert';
// import {
//   rmSync,
//   mkdirSync,
//   mkdtempSync,
//   readFileSync,
//   writeFileSync
// } from 'node:fs';

// import {it, describe, afterEach} from 'mocha';

// import {Directory} from '../../../lib/files.js';

// const workingDirectory = mkdtempSync(join(tmpdir(), 'init-command-'));
// const postdocExecutablePath = resolve('bin', 'postdoc.js');
// const artifactsDirectoryName = '__artifacts__';
// const artifactsDirectory = join(workingDirectory, artifactsDirectoryName);

// describe('init command', function () {
//   afterEach(function () {
//     rmSync(artifactsDirectory, {force: true, recursive: true});
//   });

//   it('should init the project in an empty directory', function () {
//     this.timeout(0);

//     const {error} = spawnSync(
//       'node',
//       [postdocExecutablePath, 'init', artifactsDirectoryName],
//       {cwd: workingDirectory, shell: true}
//     );

//     if (error) {
//       throw error;
//     }

//     const files = Directory(artifactsDirectory)
//       .recursive(true)
//       .files();

//     ok(files.length > 0);
//     ok(files.some((file) => file.source().endsWith('index.md')));
//     ok(files.some((file) => file.source().endsWith('package.json')));
//     ok(files.some((file) => file.source().endsWith('index.html.ejs')));
//   });

//   it('should exit early with a message if the destination directory is not empty', function () {
//     mkdirSync(artifactsDirectory);

//     writeFileSync(resolve(artifactsDirectory, 'test.md'), '');

//     const {error, output} = spawnSync(
//       'node',
//       [postdocExecutablePath, 'init', artifactsDirectoryName],
//       {cwd: workingDirectory, shell: true}
//     );

//     if (error) {
//       throw error;
//     }

//     ok(
//       output
//         .filter(Boolean)
//         .some(
//           (buffer) => buffer.toString('utf8').includes('directory is not empty')
//         )
//     );
//   });

//   it('should infer the directory name', function () {
//     this.timeout(0);

//     mkdirSync(artifactsDirectory);

//     const {error} = spawnSync(
//       'node',
//       [postdocExecutablePath, 'init', '.'],
//       {cwd: artifactsDirectory, shell: true}
//     );

//     if (error) {
//       throw error;
//     }

//     const packageJson = readFileSync(
//       join(artifactsDirectory, 'package.json'),
//       {encoding: 'utf8'}
//     );

//     const {name} = JSON.parse(packageJson);

//     strictEqual(name, artifactsDirectoryName);
//   });
// });
