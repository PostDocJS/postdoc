import { cwd } from "node:process";
import { inspect } from "node:util";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  sep,
  join,
  resolve,
  dirname,
  extname,
  basename,
  relative,
} from "node:path";

import { renderAsync } from "@pineview/ejs";
import { parseComments } from "dox";

import Logger from "./logger.js";
import Configuration from "./configuration.js";

const CLOSING_HEAD_TAG = "</head>";
const navigationManagerScript =
  "<script type=\"module\">import 'postdoc/client';</script>";

const DOC_TAGS = Object.freeze({
  API: "api",
  SEE: "see",
  W3C: "w3c",
  FUNC: "func",
  NAME: "name",
  LINK: "link",
  KIND: "kind",
  ALIAS: "alias",
  PARAM: "param",
  SINCE: "since",
  METHOD: "method",
  SYNTAX: "syntax",
  RETURN: "return",
  DISPLAY: "display",
  EXAMPLE: "example",
  TSEXAMPLE: "tsexample",
  RETURNS: "returns",
  FUNCTION: "function",
  INTERNAL: "internal",
  EDIT_LINE: "editline",
  JSON_WIRE: "jsonwire",
  SORT_INDEX: "sortIndex",
  DESCRIPTION: "description",
  EXAMPLE_LINK: "exampleLink",
});

const API_TEMPLATE = Object.freeze({
  API: "api",
  SEE: "see",
  W3C: "w3c",
  NAME: "name",
  LINK: "link",
  KIND: "kind",
  SINCE: "since",
  SYNTAX: "syntax",
  ALIASES: "aliases",
  EXAMPLE: "example",
  TSEXAMPLE: "tsexample",
  RETURNS: "returns",
  API_NAME: "apiName",
  INTERNAL: "internal",
  EDIT_LINE: "editLine",
  JSON_WIRE: "jsonWire",
  SORT_INDEX: "sortIndex",
  PARAMETERS: "parameters",
  DESCRIPTION: "description",
  EXAMPLE_LINK: "exampleLink",
});

class ApiPageEnvironment {
  constructor(
    layoutFilePath,
    apiFilePath,
    outputPagePath,
    pageUrl,
    comments,
    pages,
  ) {
    this.__filename = layoutFilePath;
    this.__dirname = dirname(layoutFilePath);

    this.require = createRequire(pathToFileURL(layoutFilePath));

    this._import = (path) =>
      import(
        path.startsWith(".")
          ? pathToFileURL(resolve(dirname(layoutFilePath), path))
          : path
      );

    this.url = (path) => {
      const absolutePath = path.startsWith(".")
        ? resolve(dirname(layoutFilePath), path)
        : path.startsWith("~")
          ? path.replace("~", cwd())
          : path;

      return relative(dirname(outputPagePath), absolutePath)
        .split(sep)
        .join("/");
    };

    this.page = {
      url: pageUrl,
      comments,
      commentsSourcePath: apiFilePath,
    };

    this.pages = pages.map((page) => page.url);

    this.appSettings = Configuration.get().appSettings;
  }
}

export default class ApiPage {
  #url;
  #apiFilePath;
  #outputFilePath;
  #layoutFilePath;

  constructor(apiFilePath, temporaryOutputDirectoryName) {
    this.#apiFilePath = apiFilePath;

    const configuration = Configuration.get();

    const rootApiDirectoryPath = resolve(configuration.apidocs.source);
    const relativeFilePath = apiFilePath.replace(rootApiDirectoryPath, "");

    this.#url = configuration.apidocs.createUrl(relativeFilePath);

    this.#outputFilePath = join(
      configuration.directories.output,
      "..",
      temporaryOutputDirectoryName,
      ...this.#url.slice(1).split("/"),
    );

    this.#layoutFilePath = resolve(
      configuration.directories.layouts,
      configuration.apidocs.layout,
    );
  }

  get url() {
    return this.#url;
  }

  get outputPath() {
    return this.#outputFilePath;
  }

  async #compileLayout(comments, pages) {
    const layoutContent = await readFile(this.#layoutFilePath, "utf8");

    const pageEnvironment = new ApiPageEnvironment(
      this.#layoutFilePath,
      this.#apiFilePath,
      this.#outputFilePath,
      this.#url,
      comments,
      pages,
    );

    const configuration = Configuration.get();

    try {
      const compiledPage = await renderAsync(layoutContent, pageEnvironment, {
        root: cwd(),
        async: true,
        views: [resolve(configuration.directories.includes)],
        filename: this.#layoutFilePath,
      });

      return compiledPage.replace(
        CLOSING_HEAD_TAG,
        `${navigationManagerScript}\n${CLOSING_HEAD_TAG}`,
      );
    } catch (error) {
      Logger.log((typography) => {
        const layoutFilePathFromPackageRoot = this.#layoutFilePath.replace(
          cwd(),
          "~",
        );

        return `
          An error occurred while rendering ${typography.bold(
            layoutFilePathFromPackageRoot,
          )} template:

          ${inspect(error, { colors: true, compact: false })}          
        `;
      }, Logger.ErrorLevel);

      return;
    }
  }

  async #parseApiFile() {
    const content = await readFile(this.#apiFilePath, "utf8");

    const parsedComments = parseComments(content, {
      skipSingleStar: true,
    }).filter((comment) => !comment.ignore && !Number.isNaN(comment.codeStart));

    if (!parsedComments.length) {
      Logger.log(
        (typography) => `
        The ${typography.dim(
          this.#apiFilePath,
        )} does not have api comments or all of them are ignored.
          Skipping this file...   
      `,
      );

      return;
    }

    return parsedComments.map((comment) => this.#normaliseComment(comment));
  }

  #normaliseComment(comment) {
    const configuration = Configuration.get();

    return comment.tags.reduce(
      (result, tag) => {
        const apiFileName = basename(
          this.#apiFilePath,
          extname(this.#apiFilePath),
        );

        result.name = result.name || comment.ctx?.name || apiFileName;
        result.description = result.description || comment.description.full;

        switch (tag.type) {
          case DOC_TAGS.NAME:
          case DOC_TAGS.KIND:
          case DOC_TAGS.FUNC:
          case DOC_TAGS.METHOD:
          case DOC_TAGS.FUNCTION: {
            const nameTag = comment.tags
              .filter((tag) =>
                [
                  DOC_TAGS.NAME,
                  DOC_TAGS.METHOD,
                  DOC_TAGS.FUNCTION,
                  DOC_TAGS.FUNC,
                ].includes(tag.type),
              )
              .pop();

            const kindTag = comment.tags
              .filter((tag) =>
                [
                  DOC_TAGS.KIND,
                  DOC_TAGS.METHOD,
                  DOC_TAGS.FUNCTION,
                  DOC_TAGS.FUNC,
                ].includes(tag.type),
              )
              .pop();

            return {
              ...result,
              [API_TEMPLATE.NAME]: nameTag?.string || result.name,
              [API_TEMPLATE.KIND]: [
                DOC_TAGS.METHOD,
                DOC_TAGS.FUNCTION,
                DOC_TAGS.FUNC,
              ].includes(kindTag?.type)
                ? DOC_TAGS.FUNCTION
                : kindTag?.string || result.kind,
            };
          }
          case DOC_TAGS.LINK: {
            return { ...result, [API_TEMPLATE.LINK]: tag.string };
          }
          case DOC_TAGS.PARAM: {
            const optional = tag.name.startsWith("[") && tag.name.endsWith("]");

            return {
              ...result,
              [API_TEMPLATE.PARAMETERS]: result.parameters.concat([
                {
                  name: optional ? tag.name.slice(1, -1) : tag.name,
                  optional,
                  description: tag.description,
                  types: Array.isArray(tag.types)
                    ? tag.types.join(" | ")
                    : tag.types,
                },
              ]),
            };
          }
          case DOC_TAGS.API: {
            return { ...result, [API_TEMPLATE.API]: tag.visibility };
          }
          case DOC_TAGS.EDIT_LINE: {
            return { ...result, [API_TEMPLATE.EDIT_LINE]: tag.editline };
          }
          case DOC_TAGS.ALIAS: {
            return {
              ...result,
              [API_TEMPLATE.ALIASES]: result.aliases.concat([tag.string]),
            };
          }
          case DOC_TAGS.DISPLAY: {
            return { ...result, [API_TEMPLATE.API_NAME]: tag.string };
          }
          case DOC_TAGS.SYNTAX: {
            return {
              ...result,
              [API_TEMPLATE.SYNTAX]: result.syntax.concat([tag.string]),
            };
          }
          case DOC_TAGS.SEE: {
            return {
              ...result,
              [API_TEMPLATE.SEE]: result.see.concat([tag.string]),
            };
          }
          case DOC_TAGS.RETURN:
          case DOC_TAGS.RETURNS: {
            const types = Array.isArray(tag.types)
              ? tag.types.join(" | ")
              : tag.types;

            return {
              ...result,
              [API_TEMPLATE.RETURNS]: {
                type: types.replace("[object Object]", "*"),
                description: tag.description || "",
              },
            };
          }
          case DOC_TAGS.SINCE: {
            return { ...result, [API_TEMPLATE.SINCE]: tag.string };
          }
          case DOC_TAGS.INTERNAL: {
            return { ...result, [API_TEMPLATE.INTERNAL]: true };
          }
          case DOC_TAGS.EXAMPLE: {
            return {
              ...result,
              [API_TEMPLATE.EXAMPLE]: result.example.concat([tag.string]),
            };
          }
          case DOC_TAGS.TSEXAMPLE: {
            return {
              ...result,
              [API_TEMPLATE.TSEXAMPLE]: result.tsexample.concat([tag.string]),
            };
          }
          case DOC_TAGS.W3C: {
            return { ...result, [API_TEMPLATE.W3C]: tag.string };
          }
          case DOC_TAGS.JSON_WIRE: {
            return { ...result, [API_TEMPLATE.JSON_WIRE]: tag.string };
          }
          case DOC_TAGS.SORT_INDEX: {
            return { ...result, [API_TEMPLATE.SORT_INDEX]: Number(tag.string) };
          }
          case DOC_TAGS.DESCRIPTION: {
            return { ...result, [API_TEMPLATE.DESCRIPTION]: tag.string };
          }
          case DOC_TAGS.EXAMPLE_LINK: {
            return { ...result, [API_TEMPLATE.EXAMPLE_LINK]: tag.string };
          }
          default: {
            const parseTag = configuration.apidocs.tags[tag.type];

            if (parseTag) {
              const maybeParsedTag = parseTag(tag, comment, result);

              return maybeParsedTag ? { ...result, ...maybeParsedTag } : result;
            }

            return result;
          }
        }
      },
      {
        [API_TEMPLATE.NAME]: "",
        [API_TEMPLATE.LINK]: "",
        [API_TEMPLATE.PARAMETERS]: [],
        [API_TEMPLATE.API]: "",
        [API_TEMPLATE.EDIT_LINE]: "",
        [API_TEMPLATE.ALIASES]: [],
        [API_TEMPLATE.API_NAME]: null,
        [API_TEMPLATE.SYNTAX]: [],
        [API_TEMPLATE.SEE]: [],
        [API_TEMPLATE.KIND]: null,
        [API_TEMPLATE.RETURNS]: null,
        [API_TEMPLATE.SINCE]: null,
        [API_TEMPLATE.INTERNAL]: false,
        [API_TEMPLATE.EXAMPLE]: [],
        [API_TEMPLATE.TSEXAMPLE]: [],
        [API_TEMPLATE.W3C]: "",
        [API_TEMPLATE.JSON_WIRE]: "",
        [API_TEMPLATE.SORT_INDEX]: 0,
        [API_TEMPLATE.DESCRIPTION]: "",
        [API_TEMPLATE.EXAMPLE_LINK]: "",
      },
    );
  }

  async compile(pages) {
    const comments = await this.#parseApiFile();

    if (!comments) {
      // We already displayed the error, so just returning here.
      return;
    }

    return this.#compileLayout(comments, pages);
  }

  async compileAndWrite(pages) {
    const compiledPage = await this.compile(pages);

    if (!compiledPage) {
      // We already displayed the error, so just returning here.
      return;
    }

    await mkdir(dirname(this.#outputFilePath), { recursive: true });

    await writeFile(this.#outputFilePath, compiledPage, "utf8");
  }
}
