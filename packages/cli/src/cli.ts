#!/usr/bin/env node

import { outputTypes } from "./utilities";

require("yargs")
  .scriptName("@vexilla/cli")
  .usage("$0 <cmd> [args]")
  .command(
    "types",
    "Generate types for your Vexilla feature flags",
    (yargs: any) => {
      yargs.options({
        i: {
          alias: "input",
          describe: "the url to your feature flag json file",
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
      });
    },
    async function (argv: any) {
      console.log("running", { argv });
      const { language, input, output, prefix } = argv;
      await outputTypes(input, output, language, prefix);
    }
  )
  .help().argv;
