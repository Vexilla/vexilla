const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const data = require("../compatibility.json");
function quote(text) {
  return (
    '"' +
    text.replace(/[\x00-\x1f\x7f"\\]/g, (char) =>
      char === '"'
        ? '\\"'
        : char === "\\"
        ? "\\\\"
        : "\\" + char.charCodeAt(0).toString().padStart(3, "0")
    ) +
    '"'
  );
}
const lines = [
  "-- Generated from contract/compatibility.json; do not edit by hand.",
  "return {",
  "  timezones = {",
];
for (const name of data.timezone.identifiers) {
  lines.push(`    [${quote(name.toLowerCase())}] = true,`);
}
lines.push("  },", "  lower = {");
for (const [upper, lower] of Object.entries(data.unicode.lower)) {
  lines.push(`    [${quote(upper)}] = ${quote(lower)},`);
}
lines.push("  },");
for (const key of ["casedRanges", "ignorableRanges"]) {
  lines.push("  " + key + " = {");
  for (const [start, end] of data.unicode[key]) {
    lines.push(`    {${start}, ${end}},`);
  }
  lines.push("  },");
}
lines.push("}", "");
const file = path.join(root, "clients/lua/vexilla/compat_data.lua");
const source = lines.join("\n");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(file, "utf8") !== source) {
    throw Error("Lua compatibility data is stale");
  }
} else {
  fs.writeFileSync(file, source);
}
