import { env } from "node:process";
import { createRequire } from "node:module";

import Logger from "./logger.js";
import Configuration from "./configuration.js";
import PostDocCommand from "./command.js";
import createRunCommand from "./commands/run.js";
import createInitCommand from "./commands/init.js";
import createTestCommand from "./commands/test.js";
import createBuildCommand from "./commands/build.js";
import createPreviewCommand from "./commands/preview.js";
import createApidocsCommand from "./commands/apidocs.js";

const require = createRequire(import.meta.url);

export default async function createCLI() {
  await Configuration.initialise(env);

  Logger.initialise();

  const postDocPackageDefinition = require("../package.json");

  return new PostDocCommand()
    .version(
      postDocPackageDefinition.version,
      "-v | --version",
      "Outputs the PostDoc version.",
    )
    .addCommand(createRunCommand())
    .addCommand(createInitCommand())
    .addCommand(createTestCommand())
    .addCommand(createBuildCommand())
    .addCommand(createPreviewCommand())
    .addCommand(createApidocsCommand());
}
