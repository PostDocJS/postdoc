#!/usr/bin/env node

import { argv } from "node:process";

import createCLI from "../lib/index.js";

// We should parse CLI arguments asynchronously
// because we have asynchronous actions attached to
// some commands.
createCLI().then((cli) => cli.parseAsync(argv));
