# postdoc

## Development

To be able to develop the project you should have NodeJS >=14, the `make` tool installed (on Unix systems it is already preinstalled).

At first, install dependencies either with `npm i` or `npm ci` commands and then use on of the desired development commands.

There are two commands:

1. `clean` (run with `make clean`) - cleans artefacts of the previous build.
2. `build` (run with `make build`) - builds project in `out` directory.

After the build is completed, you can test commands with `node ./bin/postdoc.js <arguments here...>`.

