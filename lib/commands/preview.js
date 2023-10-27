/**
 * Builds a project for production and start a simple
 * static server over produced assets. Optionally it
 * can open a browser on a specified page.
 *
 * @name preview
 * @since 0.1.0
 */

import { build, preview } from "vite";

import Logger from "../logger.js";
import Collector from "../collector.js";
import PostDocCommand from "../command.js";
import ViteConfiguration from "../vite.js";
import runAndMeasureAction from "./measured-action.js";

export default function createPreviewCommand() {
  return new PostDocCommand("preview")
    .description("Starts a simple static server over the output directory.")
    .option(
      "-o | --open [url]",
      "Automatically open the app in the browser on server start.",
    )
    .option(
      "-h | --host [url]",
      'The proxy option for the Vite\'s "host" CLI argument. It exposes the dev and preview server to the LAN and public addresses.',
    )
    .action(({ host, open }) =>
      runAndMeasureAction(async () => {
        const collector = new Collector();

        try {
          await collector.collectPages();

          await collector.writePages();

          const inlineConfig = await ViteConfiguration.createForProduction(
            collector.temporaryOutputDirectoryPath,
          );

          await build(inlineConfig);
        } catch {
          return;
        } finally {
          await collector.clear();
        }

        const inlineConfig = ViteConfiguration.createForPreview({
          preview: {
            host,
            open,
          },
        });

        const server = await preview(inlineConfig);

        Logger.log(
          () => `
            Server is listening on:
              - ${server.resolvedUrls.local.join(" | ")}
              ${
                server.resolvedUrls.network.length
                  ? "- " + server.resolvedUrls.network.join(" | ")
                  : ""
              }
          `,
          Logger.SuccessLevel,
        );
      }),
    );
}
