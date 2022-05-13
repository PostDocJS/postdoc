const {Command} = require('commander');

const {page} = require('./page.command');
const {test} = require('./test.command');

/** Crates a `create` command for the PostDoc CLI. */
exports.create = () =>
  new Command('create').addCommand(page()).addCommand(test());
