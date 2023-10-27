import {request} from 'node:https';

import Future from '@halo-lab/future';

const REGISTRY_PREFIX = 'https://registry.npmjs.org';

function fetch(url, options) {
  return Future.from((ok, err) =>
    request(url, options)
      .on('response', (response) => {
        let data = '';

        response
          .setEncoding('utf8')
          .on('data', (chunk) => (data += chunk))
          .on('error', err)
          .on('end', () =>
            ok({
              text() {
                return data;
              },
              json() {
                return JSON.parse(data);
              }
            })
          );
      })
      .on('error', err)
      .end()
  );
}

/**
 * Fetches the latest stable version of the package.
 *
 * @param {string} name - of the package.
 * @returns {Promise<string>} - a version of the package.
 */
export default function getPackageVersion(name) {
  return fetch(`${REGISTRY_PREFIX}/${name}`)
    .then((response) => response.json())
    .then((info) => info['dist-tags'].latest);
}
