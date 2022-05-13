const {Command} = require('commander');

const {run} = require('./commands/run');
const {init} = require('./commands/init');
const {test} = require('./commands/test');
const {build} = require('./commands/build');
const {create} = require('./commands/create');

exports.cli = () =>
  new Command()
    .version('0.0.1', '-v | --version')
    .addCommand(run())
    .addCommand(init())
    .addCommand(test())
    .addCommand(build())
    .addCommand(create());
