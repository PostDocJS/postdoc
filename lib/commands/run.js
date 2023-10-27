/**
 * Starts a development server. Optionally it can open a browser
 * on a specified URL. By default only localhost is allowed to
 * connect to the browser, but you can expose the address to local area network.
 *
 * @name run
 * @since 0.1.0
 */

import process from "node:process";
import { resolve } from "node:path";

import Stream from "@halo-lab/stream";
import { watch } from "chokidar";
import { createServer } from "vite";

import Logger from "../logger.js";
import Collector from "../collector.js";
import Configuration from "../configuration.js";
import PostDocCommand from "../command.js";
import ViteConfiguration from "../vite.js";
import runAndMeasureAction from "./measured-action.js";

function createWatcher() {
  const configuration = Configuration.get();

  const pagesDirectoryGlob = resolve(
    configuration.directories.pages,
    "**",
    "*",
  );
  const layoutsDirectoryGlob = resolve(
    configuration.directories.layouts,
    "**",
    "*",
  );
  const includesDirectoryGlob = resolve(
    configuration.directories.includes,
    "**",
    "*",
  );

  const watcherOptions = {
    ignoreInitial: true,
  };

  return Stream.from((send) => {
    function setUpListeners(watcher) {
      return watcher
        .on("add", (path, stats) =>
          send({
            kind: "add",
            path,
            stats,
          }),
        )
        .on("change", (path, stats) =>
          send({
            kind: "change",
            path,
            stats,
          }),
        )
        .on("unlink", (path, stats) =>
          send({
            kind: "remove",
            path,
            stats,
          }),
        );
    }

    const pagesWatcher = setUpListeners(
      watch(pagesDirectoryGlob, watcherOptions),
    );
    const layoutsWatcher = setUpListeners(
      watch(layoutsDirectoryGlob, watcherOptions),
    );
    const includesWatcher = setUpListeners(
      watch(includesDirectoryGlob, watcherOptions),
    );

    return async () => {
      await pagesWatcher.close();
      await layoutsWatcher.close();
      await includesWatcher.close();
    };
  });
}

export default function createRunCommand() {
  return new PostDocCommand("run")
    .option(
      "-o | --open [url]",
      "Automatically open the app in the browser on server start.",
    )
    .option(
      "-h | --host [url]",
      'The proxy option for the Vite\'s "host" CLI argument. It exposes the dev and preview server to the LAN and public addresses.',
    )
    .description("Starts development server with HMR and live preview.")
    .action(({ open, host }) =>
      runAndMeasureAction(async () => {
        const collector = new Collector(true);

        await collector.collectPages();

        const inlineConfig = ViteConfiguration.createForDevelopment(collector, {
          server: {
            host,
            open,
          },
        });

        const server = await createServer(inlineConfig);

        await server.listen();

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

        const events = createWatcher();

        const unsubscribe = Stream.forEach(events, async () => {
          await collector.collectPages();

          server.ws.send("postdoc:reload-page");
        });

        process.on("beforeExit", async () => {
          await unsubscribe();
          await collector.clear();
        });
      }),
    );
}
