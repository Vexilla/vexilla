#!/usr/bin/env node

import { outputTypes } from "./utilities";
import yargs from "yargs";

yargs
  .scriptName("@vexilla/cli")
  .usage("$0 <cmd> [args]")
  .command(
    "types",
    "Generate types for your Vexilla feature flags",
    (yargs: any) => {
      yargs.options({
        i: {
          alias: "input",
          describe: "the parent url path to your feature flags",
          type: "string",
          nargs: 1,
          demand: true,
          requiresArg: true,
        },
        o: {
          alias: "output",
          describe: "the output file",
          type: "string",
          nargs: 1,
          demand: true,
          requiresArg: true,
        },
        l: {
          alias: "language",
          describe: "the language of the output file",
          type: "string",
          nargs: 1,
          demand: true,
          requiresArg: true,
        },
        p: {
          alias: "prefix",
          describe: "the prefix of types generated into the output file",
          type: "string",
          nargs: 1,
          demand: true,
          default: "",
          requiresArg: false,
        },
        s: {
          alias: "suffix",
          describe: "the suffix of types generated into the output file",
          type: "string",
          nargs: 1,
          demand: true,
          default: "",
          requiresArg: false,
        },
      });
    },
    async function (argv: any) {
      const { language, input, output, prefix, suffix } = argv;
      await outputTypes(input, output, language, prefix, suffix);
      console.log(
        `Success! Types have been generated from ${input} for ${language} in ${output}.`
      );
    }
  )
  .help().argv;
