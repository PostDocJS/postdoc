#!/usr/bin/env -S node

// We should parse CLI arguments asynchronously
// because we have asynchronous actions attached to
// some commands.
require('../lib/index.js').cli().parseAsync(process.argv);
