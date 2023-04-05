import {env} from 'node:process';

import {isObject} from '../utils/fp.js';

const ENVIRONMENT_VARIABLE_RE = /^\${(.+)}$/;

/**
 * Injects environment variable into the configuration object.
 * In order to declare that value should be taken from the
 * environment users have to use the `${variable_name}` pattern
 * as the property value.
 *
 * @example
 *   {
 *     option: "${OPTION_VARIABLE_NAME}"
 *   }
 *
 * @param {import('./resolve.js').ResolvedConfiguration} value
 * @returns {import('./resolve.js').ResolvedConfiguration}
 */
export const injectEnvironments = (value) =>
  new Proxy(value, {
    get: (target, property, receiver) => {
      const value = Reflect.get(target, property, receiver);

      if (isObject(value)) {
        return injectEnvironments(value);
      } else if (typeof value !== 'string') {
        return value;
      }

      const [, environmentVariableName] = ENVIRONMENT_VARIABLE_RE.exec(value) || [];

      return environmentVariableName ? env[environmentVariableName] : value;
    }
  });
