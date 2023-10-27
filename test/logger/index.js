import {
  ok,
  throws,
  strictEqual,
  doesNotThrow,
  notStrictEqual,
} from "node:assert";

import { fake } from "sinon";
import { it, before, after, describe } from "mocha";

import { Container } from "../../lib/utils/container.js";
import { CONFIGURATION_ID } from "../../lib/configuration/index.js";
import {
  Separator,
  StatusLine,
  LineBuilder,
  MessageBuilder,
} from "../../lib/logger/index.js";

describe("Logger module", function () {
  describe("LineBuilder", function () {
    it("should be a function", function () {
      ok(typeof LineBuilder === "function");
    });

    it("should create an object", function () {
      ok(typeof LineBuilder() === "object");
    });

    describe(".build", function () {
      it("should return an empty string if no builder methods were called", function () {
        strictEqual(LineBuilder().build(), "");
      });

      it("should return a defined string when at least one builder method was called", function () {
        strictEqual(LineBuilder().text("text").build(), "text");
      });
    });

    describe(".text", function () {
      it("should accept value that will be a part of the line and return the same builder instance", function () {
        const builder = LineBuilder();

        strictEqual(builder.text("hello"), builder);

        strictEqual(builder.build(), "hello");
      });

      it("should save the value as is", function () {
        const line = LineBuilder().text("hello").text(" world").build();

        strictEqual(line, "hello world");
      });

      it("should how the text will be added to the previous saved values", function () {
        const line = LineBuilder()
          .text("hello")
          .text("world", Separator.Space)
          .build();

        strictEqual(line, "hello world");
      });
    });

    describe(".phrase", function () {
      it("should return the builder reference", function () {
        const builder = LineBuilder();

        strictEqual(builder, builder.phrase());
      });

      it("should prepend a space character to a saved value", function () {
        const line = LineBuilder().phrase("hello").phrase("world").build();

        strictEqual(line, " hello world");
      });
    });

    describe(".prefix", function () {
      it("should return the builder reference", function () {
        const builder = LineBuilder();

        strictEqual(builder, builder.prefix(""));
      });

      it("should define a prefix for the line", function () {
        const line = LineBuilder().text("world").prefix("hello").build();

        strictEqual(line, "helloworld");
      });

      it("should save only value from the last method execution", function () {
        const line = LineBuilder().prefix("hello").prefix("world").build();

        strictEqual(line, "world");
      });
    });

    describe(".suffix", function () {
      it("should return the builder reference", function () {
        const builder = LineBuilder();

        strictEqual(builder, builder.suffix(""));
      });

      it("should define a suffix for the line", function () {
        const line = LineBuilder().text("world").suffix("hello").build();

        strictEqual(line, "worldhello");
      });

      it("should save only value from the last method execution", function () {
        const line = LineBuilder().suffix("hello").suffix("world").build();

        strictEqual(line, "world");
      });
    });

    describe(".padStart", function () {
      it("should return the builder reference", function () {
        const builder = LineBuilder();

        strictEqual(builder, builder.padStart(0, ""));
      });

      it("should prepend a value a count times to the line", function () {
        const line = LineBuilder().text("word").padStart(2, "1").build();

        strictEqual(line, "11word");
      });

      it("should prepend a value a count times to the line at the execution time", function () {
        const line = LineBuilder()
          .text("word")
          .padStart(2, "1")
          .text("other")
          .padStart(2, "0")
          .build();

        strictEqual(line, "0011wordother");
      });
    });

    describe(".map", function () {
      it("should return the builder reference", function () {
        const builder = LineBuilder();

        strictEqual(
          builder,
          builder.map(() => {}),
        );
      });

      it("should define the transformer that will map the final line", function () {
        const line = LineBuilder()
          .text("hello")
          .map((value) => value + " world")
          .build();

        strictEqual(line, "hello world");
      });

      it("should save all defined transformers and map the line in a sequence", function () {
        const line = LineBuilder()
          .text("hello")
          .map((value) => value + " ")
          .map((value) => value + "world")
          .map((value) => value + "!")
          .build();

        strictEqual(line, "hello world!");
      });
    });
  });

  describe("MessageBuilder", function () {
    it("should be a function", function () {
      ok(typeof MessageBuilder === "function");
    });

    it("should return an object", function () {
      ok(typeof MessageBuilder() === "object");
    });

    describe(".build", function () {
      it("should return an empty string, by default", function () {
        strictEqual(MessageBuilder().build(), "");
      });

      it("should return concatenated lines as a message", function () {
        const message = MessageBuilder().line("hello").build();

        strictEqual(message, "hello");
      });
    });

    describe(".line", function () {
      it("should return a builder reference", function () {
        const builder = MessageBuilder();

        strictEqual(builder, builder.line(""));
      });

      it("should add a text as lines to the message separated by the new line symbol", function () {
        const message = MessageBuilder().line("hello").line("world").build();

        strictEqual(message, "hello\nworld");
      });
    });

    describe(".lineIf", function () {
      it("should return a builder reference", function () {
        const builder = MessageBuilder();

        strictEqual(
          builder,
          builder.lineIf(
            () => true,
            () => "",
          ),
        );
      });

      it('should save a line if the predicate returns "true"', function () {
        const message = MessageBuilder()
          .lineIf(
            () => true,
            () => "text",
          )
          .build();

        strictEqual(message, "text");
      });

      it('should not save a line if the predicate returns "false"', function () {
        const message = MessageBuilder()
          .lineIf(
            () => false,
            () => "text",
          )
          .build();

        strictEqual(message, "");
      });
    });

    describe(".map", function () {
      it("should return a builder reference", function () {
        const builder = MessageBuilder();

        strictEqual(
          builder,
          builder.map(() => ""),
        );
      });

      it("should map the final message with a provided transformer", function () {
        const map = fake((value) => value.replace("1", ""));

        const message = MessageBuilder().line("hello1").map(map).build();

        ok(typeof map.firstArg === "string");
        strictEqual(map.firstArg, "hello1");
        strictEqual(message, "hello");
      });

      it("should chain the transformers to be executed in a sequence", function () {
        const firstMap = fake((value) => "1" + value);
        const secondMap = fake((value) => "2" + value);
        const thirdMap = fake((value) => "3" + value);

        const message = MessageBuilder()
          .line("hello")
          .line("world")
          .map(firstMap)
          .map(secondMap)
          .map(thirdMap)
          .build();

        strictEqual(message, "321hello\nworld");
        strictEqual(firstMap.firstCall.firstArg, "hello\nworld");
        strictEqual(secondMap.firstCall.firstArg, "1hello\nworld");
        strictEqual(thirdMap.firstCall.firstArg, "21hello\nworld");
      });
    });

    describe(".pipe", function () {
      it("should not return a builder reference", function () {
        const builder = MessageBuilder();

        notStrictEqual(
          builder,
          builder.pipe(() => {}),
        );
      });

      it("should pass lines one by one to the provided function", function () {
        const logger = fake((_value) => {});

        MessageBuilder().line("hello").line("world").pipe(logger);

        ok(logger.calledTwice);
        strictEqual(logger.args[0][0], "hello");
        strictEqual(logger.args[1][0], "world");
      });
    });

    describe(".pipeIf", function () {
      it("should not return a builder reference", function () {
        const builder = MessageBuilder();

        notStrictEqual(
          builder,
          builder.pipeIf(
            () => true,
            () => {},
          ),
        );
      });

      it('should pass lines one by one to the provided function if the predicate returns "true"', function () {
        const logger = fake((_value) => {});

        MessageBuilder()
          .line("hello")
          .line("world")
          .pipeIf(() => true, logger);

        ok(logger.calledTwice);
        strictEqual(logger.args[0][0], "hello");
        strictEqual(logger.args[1][0], "world");
      });

      it('should not execute the provided function if the predicate returns "false"', function () {
        const logger = fake((_value) => {});

        MessageBuilder()
          .line("hello")
          .line("world")
          .pipeIf(() => false, logger);

        ok(logger.notCalled);
      });

      it('should execute the elseLogger if the predicate returns "false"', function () {
        const logger = fake();
        const elseLogger = fake();

        MessageBuilder()
          .line("hello")
          .line("world")
          .pipeIf(() => false, logger, elseLogger);

        ok(logger.notCalled);
        ok(elseLogger.called);
      });
    });
  });

  describe("StatusLine pattern", function () {
    before(function () {
      Container.set(CONFIGURATION_ID, {
        logger: {
          quiet: false,
          noColors: false,
        },
      });
    });

    it("should be a function", function () {
      ok(typeof StatusLine === "function");
    });

    it("should accept a Date argument", function () {
      doesNotThrow(() => StatusLine(new Date()));
      throws(() => StatusLine(7));
      throws(() => StatusLine("blah"));
      throws(() => StatusLine({}));
    });

    it("should return a LineBuilder instance", function () {
      const builder = StatusLine(new Date());

      ok(builder.text);
      ok(builder.build);
      ok(builder.phrase);
      ok(builder.padStart);
    });

    it('should return a line in a "Date: day month hours:minutes:seconds - Time: ~millisecondsms format', function () {
      // The line is mixed with the colors unicode characters.
      // I'm not sure how to properly test that line.
      const line = StatusLine(new Date()).build();

      ok(/Date:/.test(line));
      ok(/\d{1,2}\s[A-Z][a-z]{2}\s\d{2}:\d{2}:\d{2}/.test(line));
      ok(/Time:\s~/.test(line));
    });

    after(function () {
      Container.remove(CONFIGURATION_ID);
    });
  });
});
