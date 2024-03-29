import Logger from './logger.js';

export default class PostDocError extends Error {
  constructor(reason, parameters = {}) {
    const typography = Logger.get().typography;

    let message = '';

    switch (reason) {
      case 'page:ignored-layout':
        message = `The layout ${typography.dim(parameters.layoutPagePath)} is ignored for the page ${typography.green(parameters.pageUrl)}.`;
        break;
      case 'page:missed-layout':
        message = `The ${typography.green(parameters.pageUrl)} page does not have corresponding layout file.`;
        break;
      default:
        message = 'Unknown error occurred.';
    }

    super(message);

    this.reason = reason;
    this.parameters = parameters;
  }
}
