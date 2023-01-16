const {env} = require('process');

const {isObject} = require('../utils/fp.js');

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
 * @param {import('./defaults.js').Configuration} value
 * @returns {import('./defaults.js').Configuration}
 */
exports.injectEnvironments = function wrap(value) {
  return new Proxy(value, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);

      if (isObject(value)) {
        return wrap(value);
      } else if (typeof value !== 'string') {
        return value;
      }

      const [, environmentVariableName] = ENVIRONMENT_VARIABLE_RE.exec(value) || [];

      return environmentVariableName ? env[environmentVariableName] : value;
    }
  });
};
