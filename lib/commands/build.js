/**
 * Builds a project for production.
 *
 * @name build
 * @since 0.1.0
 */

import { build } from "vite";

import Collector from "../collector.js";
import PostDocCommand from "../command.js";
import ViteConfiguration from "../vite.js";
import runAndMeasureAction from "./measured-action.js";

export default function createBuildCommand() {
  return new PostDocCommand("build")
    .description("Builds the project, copies assets into an output directory.")
    .action(() =>
      runAndMeasureAction(async () => {
        const collector = new Collector();

        try {
          await collector.collectPages();

          await collector.writePages();

          const inlineConfig = await ViteConfiguration.createForProduction(
            collector.temporaryOutputDirectoryPath,
          );

          await build(inlineConfig);
        } finally {
          await collector.clear();
        }
      }),
    );
}
