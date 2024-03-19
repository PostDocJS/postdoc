import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { cwd } from 'node:process';
import Configuration from './configuration.js';



export default function runSearchIndex() {
    const configuration = Configuration.get();
    const htmlOutputPath = resolve(configuration.directories.output);
    const pagefindOutputPath = resolve(configuration.directories.output, "assets");

    return new Promise((resolvePromise, reject) => {
        const process = spawn('npx', ['-y', 'pagefind', '--site', htmlOutputPath, '--output-path', pagefindOutputPath], {
            stdio: 'inherit',
            shell: true,
            cwd: cwd()
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolvePromise();
            } else {
                reject(new Error(`Pagefind indexing process exited with code ${code}`));
            }
        });
    });
}
