const { compileFromFile } = require("json-schema-to-typescript");
const { readFileSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
(async () => {
  const output = (
    await Promise.all(
      ["manifest", "group"].map((name) =>
        compileFromFile(resolve(__dirname, "../schema/v1", name + ".json"), {
          bannerComment: "",
          additionalProperties: false,
          unknownAny: true,
        })
      )
    )
  ).join("\n");
  const target = resolve(__dirname, "../src/published.ts");
  const text =
    "// Generated from schema/v1 by pnpm --filter @vexilla/types generate. Do not edit.\n" +
    output;
  if (process.argv.includes("--check")) {
    if (readFileSync(target, "utf8") !== text) {
      throw new Error(
        "Published types are stale. Run pnpm --filter @vexilla/types generate."
      );
    }
  } else {
    writeFileSync(target, text);
  }
})();
