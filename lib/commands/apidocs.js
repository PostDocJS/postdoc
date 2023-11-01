/**
 * @name apidocs
 * @since 0.1.0
 */

import Logger from "../logger.js";
import PostDocCommand from "../command.js";
import runAndMeasureAction from "./measured-action.js";
import generateCliApiPages from "../apidocs/from-cli.js";
// import generateApiHtmlFiles from "../apidocs/index.js";

export default function createApidocsCommand() {
  return new PostDocCommand("apidocs")
    .option(
      "-o | --output [output]",
      "An output directory name where the MD or HTML files should be created.",
    )
    .option(
      "--from-cli",
      "Tries to generate API pages based on the current project's CLI commands and options.",
    )
    .action(({ output, fromCli }) =>
      runAndMeasureAction(async () => {
        if (fromCli) {
          const pagesWereGenerated = await generateCliApiPages(output);

          if (!pagesWereGenerated) {
            // An error was displayed, so we should just finish execution here.
            return;
          }
        } else {
          // await generateApiHtmlFiles(sources);
        }

        Logger.log(
          () => "Apidocs are successfully generated.",
          Logger.SuccessLevel,
        );
      }),
    );
}
