#!/usr/bin/env -S node

// We should parse CLI arguments asynchronously
// because we have asynchronous actions attached to
// some commands.
require('../lib').cli().parseAsync(process.argv);
