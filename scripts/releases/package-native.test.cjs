"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
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

const revision = "a".repeat(40);
const sourceUrl = `https://github.com/Vexilla/vexilla/blob/${revision}/clients/elixir/`;
const sourceLinks = [
  `<a title="View Source" href="${sourceUrl}lib/Vexilla/client.ex#L1">module</a>`,
  `<a href="${sourceUrl}lib/Vexilla/client.ex#L2" rel="help" title="View Source">function</a>`,
  `<a href="${sourceUrl}README.md#L1" title="View Source">readme</a>`,
  `<a title="View Source" href="${sourceUrl}LICENSE#L1">license</a>`,
].join("\n");

function inspectDocs(html) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-docs-links-"));
  try {
    const docs = path.join(directory, "docs");
    const source = path.join(directory, "source");
    fs.mkdirSync(docs);
    fs.mkdirSync(path.join(source, "lib/Vexilla"), { recursive: true });
    fs.writeFileSync(path.join(source, "lib/Vexilla/client.ex"), "defmodule Client do\nend\n");
    fs.writeFileSync(path.join(source, "README.md"), "Client readme\n");
    fs.writeFileSync(path.join(source, "LICENSE"), "Client license\n");
    fs.writeFileSync(path.join(docs, "client.html"), html);
    fs.writeFileSync(
      path.join(docs, "api-reference.html"),
      '<a href="https://github.com/Vexilla/vexilla" title="View Source">project</a>'
    );
    return spawnSync(
      "python3",
      [
        "-c",
        `import importlib.util, pathlib, sys
spec = importlib.util.spec_from_file_location("package_native", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.inspect_docs_links(pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3]), sys.argv[4])`,
        path.join(__dirname, "package-native.py"),
        docs,
        source,
        revision,
      ],
      { encoding: "utf8", env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" } }
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("generated module, function, and extra-page source links resolve inside the approved client", () => {
  const result = inspectDocs(sourceLinks);
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, html] of [
  ["repository-root paths", sourceLinks.replaceAll("/clients/elixir/", "/")],
  ["a mutable source ref", sourceLinks.replaceAll(revision, "main")],
  ["a missing source file", sourceLinks.replace("lib/Vexilla/client.ex#L2", "lib/Vexilla/missing.ex#L2")],
  ["a nonexistent function line", sourceLinks.replace("client.ex#L2", "client.ex#L999")],
  ["missing source links", "<p>No source links</p>"],
]) {
  test(`documentation packaging rejects ${name}`, () => {
    const result = inspectDocs(html);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Docs source link|Generated docs must include/);
  });
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
