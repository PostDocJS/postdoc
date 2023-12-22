import { request } from 'node:https';

const REGISTRY_PREFIX = 'https://registry.npmjs.org';

function fetch(url, options) {
  return new Promise((resolve, reject) =>
    request(url, options)
      .on('response', (response) => {
        let data = '';

        response
          .setEncoding('utf8')
          .on('data', (chunk) => (data += chunk))
          .on('error', reject)
          .on('end', () =>
            resolve({
              text() {
                return data;
              },
              json() {
                return JSON.parse(data);
              }
            })
          );
      })
      .on('error', reject)
      .end()
  );
}

/**
 * Fetches the latest stable version of the npm package.
 *
 * @ignore
 * @param {string} name - of the package.
 * @returns {Promise<string>} - a version of the package.
 */
export default function getPackageVersion(name) {
  return fetch(`${REGISTRY_PREFIX}/${name}`)
    .then((response) => response.json())
    .then((info) => info['dist-tags'].latest);
}
