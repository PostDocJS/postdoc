#!/usr/bin/env -S node

import process from 'process';

import cli from '../out/mod.js';

// We should parse CLI arguments asynchronously
// because we have asynchronous actions attached to
// some commands.
cli().parseAsync(process.argv);
