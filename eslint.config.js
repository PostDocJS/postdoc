import js from "@eslint/js";
import globals from "globals";

function mapGlobals(globals) {
  return Object.fromEntries(
    Object.entries(globals).map(([name, isMutable]) => [
      name,
      isMutable ? "writable" : "readonly",
    ]),
  );
}

export default [
  {
    ignores: ["templates/**/*.js"],
  },
  js.configs.recommended,
  {
    files: ["nightwatch.conf.cjs"],
    languageOptions: {
      globals: mapGlobals(globals.node),
    },
  },
  {
    files: ["lib/**/*.js", "bin/*.js", "eslint.config.js"],
    languageOptions: {
      globals: mapGlobals(globals.nodeBuiltin),
    },
  },
  {
    files: ["client/*.js"],
    languageOptions: {
      globals: mapGlobals(globals.browser),
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        ...mapGlobals(globals.mocha),
        ...mapGlobals(globals.nodeBuiltin),
      },
    },
  },
];
