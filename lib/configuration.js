import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import Future from "@halo-lab/future";
import deepmerge from "deepmerge";
import { config } from "dotenv";

const EnvironmentType = {
  MODULE: "module",
  COMMONJS: "commonjs",
};

const assetsToCache = [
  "js",
  "css",
  "html",
  "json",
  "png",
  "jpeg",
  "jpg",
  "ico",
  "webp",
  "avif",
  "svg",
  "woff2",
];

const ENVIRONMENT_VARIABLE_RE = /^\${(.+)}$/;

const require = createRequire(import.meta.url);

export default class Configuration {
  static #instance;
  static #names = [
    "postdoc.config.mjs",
    "postdoc.config.cjs",
    "postdoc.config.js",
    "postdoc.config.json",
  ];

  static async initialise(environment) {
    config({ debug: Boolean(environment.DEBUG) });

    const configuration = new Configuration(environment);

    const userConfiguration = await configuration.#resolveUserConfiguration();

    if (userConfiguration) {
      configuration.#walkAndInjectEnvironmentVariables(
        environment,
        userConfiguration,
      );
    }

    this.#instance = userConfiguration
      ? deepmerge(configuration, userConfiguration)
      : configuration;
  }

  static get() {
    if (!this.#instance) {
      throw new Error("Configuration is not initialised yet.");
    }

    return this.#instance;
  }

  #isModuleEnvironmentInPackage;

  pwa = {
    strategies: "generateSW",
    registerType: "autoUpdate",
    workbox: {
      globPatterns: [`**/*.{${assetsToCache.join(",")}}`],
    },
  };

  directories = {
    pages: "docs",
    tests: "test",
    output: "out",
    layouts: "layouts",
    includes: "includes",
  };

  apidocs = {
    outputDirectory: "apidocs",
    tags: {},
  };

  ignore = {
    pages: [],
  };

  logger = {
    quiet: false,
  };

  apiExtractor = "dox";

  appSettings = {};

  markdown = {
    options: { async: true },
    shikiOptions: {},
    extensions: [],
  };

  constructor(environment) {
    this.logger.noColors = Boolean(environment.NO_COLOR);
    this.apidocs.template = join(
      this.directories.includes,
      "default_apidocs_template.ejs",
    );

    const packageDefinitionFilePath = resolve("package.json");
    const { name = "", type = EnvironmentType.COMMONJS } = existsSync(
      packageDefinitionFilePath,
    )
      ? require(packageDefinitionFilePath)
      : {};

    this.appSettings.name = name;
    this.#isModuleEnvironmentInPackage = type === EnvironmentType.MODULE;
  }

  async #resolveUserConfiguration() {
    for (const configurationFileName of Configuration.#names) {
      const configurationFilePath = resolve(configurationFileName);

      const existConfigurationFile = existsSync(configurationFilePath);

      if (existConfigurationFile) {
        const maybeUserConfiguration = this.#isModuleEnvironmentInPackage
          ? await import(pathToFileURL(configurationFilePath).toString()).then(
              (module) => module.default,
            )
          : require(configurationFilePath);

        return typeof maybeUserConfiguration === "object"
          ? maybeUserConfiguration
          : await Future.spawn(maybeUserConfiguration);
      }
    }
  }

  #walkAndInjectEnvironmentVariables(environment, userConfiguration) {
    for (const property in userConfiguration) {
      const value = userConfiguration[property];

      if (typeof value === "object") {
        this.#walkAndInjectEnvironmentVariables(environment, value);
      } else if (typeof value === "string") {
        const [, environmentVariableName] =
          ENVIRONMENT_VARIABLE_RE.exec(value) ?? [];

        if (environmentVariableName) {
          userConfiguration[property] = environment[environmentVariableName];
        }
      }
    }
  }
}
