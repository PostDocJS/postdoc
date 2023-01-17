#!/usr/bin/env -S node

import {argv} from 'node:process';

import {initializeCLI} from '../lib/index.js';

// We should parse CLI arguments asynchronously
// because we have asynchronous actions attached to
// some commands.
initializeCLI().then((cli) => cli.parseAsync(argv));
