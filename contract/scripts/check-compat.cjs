const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const expected = fs.readFileSync(
  path.join(root, "contract/compatibility.json")
);
for (const file of [
  "clients/elixir/priv/compatibility.json",
  "clients/php/src/compatibility.json",
  "packages/types/src/compatibility.json",
  "clients/kotlin/src/main/resources/compatibility.json",
  "clients/python/vexilla_client/compatibility.json",
  "clients/go/pkg/internal/compatibility.json",
  "clients/rust/src/compatibility.json",
  "clients/csharp/Vexilla.Client/compatibility.json",
]) {
  if (!fs.readFileSync(path.join(root, file)).equals(expected)) {
    throw Error("Publisher compatibility data drift: " + file);
  }
}
execFileSync(
  process.execPath,
  [path.join(__dirname, "generate-lua-compat.cjs"), "--check"],
  { stdio: "inherit" }
);
execFileSync(
  process.execPath,
  [path.join(__dirname, "generate-swift-compat.cjs"), "--check"],
  { stdio: "inherit" }
);
execFileSync(
  process.execPath,
  [path.join(__dirname, "generate-kotlin-numeric.cjs"), "--check"],
  { stdio: "inherit" }
);
execFileSync(
  process.execPath,
  [path.join(__dirname, "generate-ocaml-compat.cjs"), "--check"],
  { stdio: "inherit" }
);
console.log("SDK compatibility data matches the pinned publisher contract");
