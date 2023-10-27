import {
  str,
  char,
  skip,
  many,
  many1,
  mapTo,
  parse,
  letter,
  choice,
  between,
  possibly,
  endOfInput,
  sequenceOf,
  whitespace,
  pipeParsers,
  everyCharUntil,
  optionalWhitespace,
} from "arcsecond";

const newLine = sequenceOf([possibly(char("\r")), char("\n")]);

const parseUsage = pipeParsers([
  sequenceOf([
    str("Usage"),
    skip(char(":")),
    everyCharUntil(newLine),
    possibly(
      everyCharUntil(
        choice([str("Options"), str("Commands"), str("Arguments"), endOfInput]),
      ),
    ),
    possibly(
      sequenceOf([
        optionalWhitespace,
        str("Arguments:"),
        optionalWhitespace,
        everyCharUntil(whitespace),
        everyCharUntil(choice([str("Options"), str("Commands")])),
      ]),
    ),
  ]),
  mapTo(([_, __, signature, description, possiblyArgument]) => {
    const [, , , argumentName, argumentDescription] = possiblyArgument ?? [];

    const signatureWords = signature.trim().split(/\s+/);
    const nameIndex =
      signatureWords.findIndex((word) => word.startsWith("[")) - 1;

    return {
      name: signatureWords[nameIndex],
      signature: signature.trim(),
      description: description.trim(),
      argument: argumentName
        ? {
            name: argumentName,
            description: argumentDescription,
          }
        : null,
    };
  }),
]);

const parseOption = pipeParsers([
  sequenceOf([
    skip(whitespace),
    skip(str("--")),
    everyCharUntil(whitespace),
    possibly(
      pipeParsers([
        skip(between(whitespace)(whitespace)(char("/"))),
        skip(char("-")),
        letter,
      ]),
    ),
    skip(whitespace),
    everyCharUntil(newLine),
  ]),
  mapTo(([_, __, name, letter, ___, description]) => ({
    name,
    shortSymbol: letter,
    description,
  })),
]);

const parseOptions = pipeParsers([str("Options:"), many1(parseOption)]);

const parseSubcommand = pipeParsers([
  sequenceOf([
    optionalWhitespace,
    everyCharUntil(whitespace),
    skip(many(char(" "))),
    possibly(everyCharUntil(newLine)),
  ]),
  mapTo(([_, name, __, description]) => ({ name, description })),
]);

const parseSubcommands = pipeParsers([
  optionalWhitespace,
  str("Commands:"),
  many(parseSubcommand),
]);

export const parseCommanderOutput = parse(
  pipeParsers([
    sequenceOf([
      parseUsage,
      possibly(parseOptions),
      possibly(parseSubcommands),
    ]),
    mapTo(([usage, options, commands]) => ({
      usage,
      options,
      commands: commands?.filter(({ name }) => name !== "help"),
    })),
  ]),
);
