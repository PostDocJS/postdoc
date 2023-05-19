import {env} from 'node:process';

import {isObject} from '../utils/fp.js';

const ENVIRONMENT_VARIABLE_RE = /^\${(.+)}$/;

/**
 * Checks if a given value is an object but not an array.
 *
 * @param {any} value - The value to check.
 * @returns {boolean} - True if the value is an object but not an array, false otherwise.
 */
function isPlainObject(value) {
  return isObject(value) && !Array.isArray(value);
}

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
export const injectEnvironments = (value) => new Proxy(value, {
  get: (target, property, receiver) => {
    const value = Reflect.get(target, property, receiver);

    if (isPlainObject(value)) {
      // If the value is an object, we recursively inject environment variables.
      return injectEnvironments(value);
    }

    if (typeof value === 'string') {
      // If the value is a string, we try to replace it with the corresponding environment variable.
      const [, environmentVariableName] = ENVIRONMENT_VARIABLE_RE.exec(value) || [];

      return environmentVariableName
        // Return environment variable if available, or original value if not.
        ? (env[environmentVariableName] || value)
        : value;
    }

    // For any other types (e.g., number, boolean, etc.), we just return the value as is.
    return value;
  }
});
