import Future from "@halo-lab/future";

import { Symbols } from "../logger/symbols.js";
import { Duration } from "../utils/date.js";
import { Container } from "../utils/container.js";
import { Typography } from "../logger/colors.js";
import { CustomCommand } from "../utils/custom-command.js";
import { CONFIGURATION_ID } from "../configuration/index.js";
import { Mode, defineMode } from "../mode.js";
import { generateApiDocFiles } from "../apidocs/index.js";
import {
  info,
  StatusLine,
  LineBuilder,
  MessageBuilder,
} from "../logger/index.js";

/**
 * Allows to generate pages from CLI `help` command output by setting the **--from-cli** option
 * or from comments of files inside the **sourceDirectory**.
 *
 * @example
 * postdoc apidocs ../project/lib --template includes/lib_template.ejs --output pages/api
 *
 * You need to define an EJS template where you can describe the markup for the future page
 * and define places where content of the comment tags must be inserted.
 *
 * @example
 * &lt;div>
 *   &lt;h1><%%= name %></h1>
 *   &lt;p><%%- description %></p>
 * &lt;/div>
 *
 * If you want to generate pages from the CLI's `help` command, you have to be in the
 * source project which uses a CLI and `--output` option determines where to put generated
 * content.
 *
 * @example
 * postdoc apidocs --from-cli --output ../website/pages
 *
 * @since 0.1.0
 */
export const apidocs = (configuration) =>
  new CustomCommand("apidocs")
    .argument(
      "[sourceDirectory]",
      "A path to the source directory of the JavaScript files to extract the comments from. If --from-cli option is provided, this argument can be omitted. Otherwise, it is mandatory.",
    )
    .option(
      "-o | --output [output]",
      "An output directory name where the MD or EJS files should be created.",
      configuration.apidocs.outputDirectory,
    )
    .option(
      "-t | --template [template]",
      "A path to the template that is used in the generation process.",
      configuration.apidocs.template,
    )
    .option(
      "-c | --stdout",
      "Does not save the data to file system but prints to the console.",
      false,
    )
    .option(
      "--from-cli",
      "Tries to generate API pages based on the current project's CLI commands and options.",
    )
    .action((sourceDirectory, { stdout, output, template, fromCli }) => {
      const duration = Duration();

      defineMode(Mode.ApiDocsGeneration);

      return Future.map(
        generateApiDocFiles(
          Container.get(CONFIGURATION_ID),
          sourceDirectory,
          output,
          template,
          stdout,
          fromCli,
        ),
        () =>
          MessageBuilder()
            .line(
              LineBuilder()
                .text(Typography().green(Symbols.Check))
                .phrase("Apidoc pages are successfully generated.")
                .build(),
            )
            .line(StatusLine(duration.untilNow().toDate()).build())
            .pipe(info),
      );
    });
