#!/usr/bin/env -S node

const process = require('process');

const {initializeCLI} = require('../lib/index.js');

// We should parse CLI arguments asynchronously
// because we have asynchronous actions attached to
// some commands.
initializeCLI().then((cli) => cli.parseAsync(process.argv));
