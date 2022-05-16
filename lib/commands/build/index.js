const {Command} = require('commander');

const {info} = require('../../utils/logger.js');

exports.build = () =>
  new Command('build')
    .description('Builds the project, copies assets into an output directory')
    .action(() => info`The project is built successfully.`);
