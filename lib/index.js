const {Command} = require('commander');

const {run} = require('./commands/run/index.js');
const {init} = require('./commands/init/index.js');
const {test} = require('./commands/test/index.js');
const {build} = require('./commands/build/index.js');
const {create} = require('./commands/create/index.js');

exports.cli = () =>
  new Command()
    .version('0.0.1', '-v | --version', 'Outputs the version number.')
    .addCommand(run())
    .addCommand(init())
    .addCommand(test())
    .addCommand(build())
    .addCommand(create());
