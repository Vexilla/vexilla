"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function inspect(files, sdk) {
  return spawnSync(
    "python3",
    [
      "-c",
      `import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("package_native", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.inspect_files(json.loads(sys.argv[2]), sys.argv[3])`,
      path.join(__dirname, "package-native.py"),
      JSON.stringify(files),
      sdk,
    ],
    { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } }
  );
}

for (const [sdk, files, compatibility] of [
  ["elixir", ["mix.exs", "README.md", "LICENSE", "lib/Vexilla/client.ex"], "priv/compatibility.json"],
  ["rust", ["Cargo.toml", "Cargo.toml.orig", "Cargo.lock", "README.md", "LICENSE", "src/lib.rs"], "src/compatibility.json"],
]) {
  test(`${sdk} packages require the compatibility asset and reject unrelated JSON`, () => {
    const missing = inspect(files, sdk);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Missing required package files/);
    assert.ok(missing.stderr.includes(compatibility));

    const complete = [...files, compatibility];
    const accepted = inspect(complete, sdk);
    assert.equal(accepted.status, 0, accepted.stderr);

    for (const extra of ["src/secrets.json", "priv/secrets.json"]) {
      const rejected = inspect([...complete, extra], sdk);
      assert.equal(rejected.status, 1);
      assert.match(rejected.stderr, /Unexpected .* package file/);
    }
  });
}
