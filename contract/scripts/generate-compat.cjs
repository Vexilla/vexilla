const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "../..");
const canonicalFile = "contract/compatibility.json";
const jsonTargets = [
  "clients/elixir/priv/compatibility.json",
  "clients/php/src/compatibility.json",
  "packages/types/src/compatibility.json",
  "clients/kotlin/src/main/resources/compatibility.json",
  "clients/python/vexilla_client/compatibility.json",
  "clients/go/pkg/internal/compatibility.json",
  "clients/rust/src/compatibility.json",
  "clients/csharp/Vexilla.Client/compatibility.json",
];

function quoteLua(text) {
  return (
    '"' +
    text.replace(/[\x00-\x1f\x7f"\\]/g, (character) => {
      if (character === '"') {
        return '\\"';
      }
      if (character === "\\") {
        return "\\\\";
      }
      return "\\" + character.charCodeAt(0).toString().padStart(3, "0");
    }) +
    '"'
  );
}

function renderLua(data) {
  const lines = [
    "-- Generated from contract/compatibility.json; do not edit by hand.",
    "return {",
    "  timezones = {",
  ];
  for (const timezone of data.timezone.identifiers) {
    lines.push(`    [${quoteLua(timezone.toLowerCase())}] = true,`);
  }
  lines.push("  },", "  lower = {");
  for (const [uppercase, lowercase] of Object.entries(data.unicode.lower)) {
    lines.push(`    [${quoteLua(uppercase)}] = ${quoteLua(lowercase)},`);
  }
  lines.push("  },");
  for (const rangeName of ["casedRanges", "ignorableRanges"]) {
    lines.push(`  ${rangeName} = {`);
    for (const [start, end] of data.unicode[rangeName]) {
      lines.push(`    {${start}, ${end}},`);
    }
    lines.push("  },");
  }
  lines.push("}", "");
  return lines.join("\n");
}

function renderSwift(source) {
  return (
    "// Generated from contract/compatibility.json; do not edit by hand.\n" +
    'enum CompatibilityData {\n    static let json = #####"""\n' +
    source.trimEnd() +
    '\n"""#####\n}\n'
  );
}

function renderOcaml(source) {
  return (
    "(* Generated from contract/compatibility.json; do not edit by hand. *)\n" +
    "let json = {vexilla|" +
    source +
    "|vexilla}\n"
  );
}

function generateCompatibility({ root = repositoryRoot, check = false } = {}) {
  const source = fs.readFileSync(path.join(root, canonicalFile), "utf8");
  const data = JSON.parse(source);
  const outputs = new Map(jsonTargets.map((file) => [file, source]));
  outputs.set("clients/lua/vexilla/compat_data.lua", renderLua(data));
  outputs.set(
    "clients/swift/Sources/VexillaClient/CompatibilityData.swift",
    renderSwift(source)
  );
  outputs.set("clients/ocaml/lib/compatibility_data.ml", renderOcaml(source));

  const staleFiles = [];
  for (const [relativePath, expected] of outputs) {
    const target = path.join(root, relativePath);
    const expectedBytes = Buffer.from(expected, "utf8");
    let actual;
    try {
      actual = fs.readFileSync(target);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    if (actual && actual.equals(expectedBytes)) {
      continue;
    }
    if (check) {
      staleFiles.push(relativePath);
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, expectedBytes);
    }
  }

  if (staleFiles.length) {
    throw new Error(
      "Generated SDK compatibility data is stale or missing:\n" +
        staleFiles.map((file) => `  ${file}`).join("\n") +
        "\nRun pnpm contract:compat:generate and commit the generated assets."
    );
  }
  return outputs.size;
}

if (require.main === module) {
  try {
    const cliArguments = process.argv.slice(2);
    if (cliArguments.some((argument) => argument !== "--check")) {
      throw new Error(
        "Usage: node contract/scripts/generate-compat.cjs [--check]"
      );
    }
    const check = cliArguments.includes("--check");
    const count = generateCompatibility({ check });
    const action = check ? "Checked" : "Generated";
    console.log(
      `${action} ${count} SDK compatibility assets from ${canonicalFile}`
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { generateCompatibility };
