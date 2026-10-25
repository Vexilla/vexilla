const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { generateCompatibility } = require("./generate-compat.cjs");

const canonicalSource = fs.readFileSync(
  path.join(__dirname, "../compatibility.json"),
  "utf8"
);
const jsonAssets = [
  "packages/types/src/compatibility.json",
  "clients/csharp/Vexilla.Client/compatibility.json",
  "clients/elixir/priv/compatibility.json",
  "clients/go/pkg/internal/compatibility.json",
  "clients/kotlin/src/main/resources/compatibility.json",
  "clients/php/src/compatibility.json",
  "clients/python/vexilla_client/compatibility.json",
  "clients/rust/src/compatibility.json",
];
const luaAsset = "clients/lua/vexilla/compat_data.lua";
const swiftAsset =
  "clients/swift/Sources/VexillaClient/CompatibilityData.swift";
const ocamlAsset = "clients/ocaml/lib/compatibility_data.ml";
const allAssets = [...jsonAssets, luaAsset, swiftAsset, ocamlAsset];

function createWorkspace(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "vexilla-compatibility-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "contract"));
  fs.writeFileSync(
    path.join(root, "contract/compatibility.json"),
    canonicalSource
  );
  return root;
}

function snapshotAssets(root) {
  return allAssets.map((file) => {
    const target = path.join(root, file);
    return fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  });
}

test("one generation produces every standalone SDK asset deterministically", (context) => {
  const root = createWorkspace(context);
  assert.equal(generateCompatibility({ root }), 11);
  for (const file of jsonAssets) {
    assert.equal(
      fs.readFileSync(path.join(root, file), "utf8"),
      canonicalSource
    );
  }
  assert.ok(
    fs
      .readFileSync(path.join(root, swiftAsset), "utf8")
      .includes(canonicalSource.trimEnd())
  );
  assert.ok(
    fs
      .readFileSync(path.join(root, ocamlAsset), "utf8")
      .includes(canonicalSource)
  );
  assert.ok(fs.existsSync(path.join(root, luaAsset)));

  const firstGeneration = snapshotAssets(root);
  assert.equal(generateCompatibility({ root }), 11);
  assert.equal(generateCompatibility({ root, check: true }), 11);
  assert.deepEqual(snapshotAssets(root), firstGeneration);
  assert.equal(
    fs.readFileSync(path.join(root, "contract/compatibility.json"), "utf8"),
    canonicalSource
  );
});

test("checking reports all stale and missing representations without repairing them", (context) => {
  const root = createWorkspace(context);
  generateCompatibility({ root });
  fs.writeFileSync(path.join(root, jsonAssets[0]), "{}\n");
  fs.unlinkSync(path.join(root, luaAsset));
  fs.writeFileSync(path.join(root, swiftAsset), "// stale\n");
  fs.unlinkSync(path.join(root, ocamlAsset));
  const beforeCheck = snapshotAssets(root);

  assert.throws(
    () => generateCompatibility({ root, check: true }),
    (error) => {
      for (const file of [jsonAssets[0], luaAsset, swiftAsset, ocamlAsset]) {
        assert.ok(
          error.message.includes(file),
          `Missing diagnostic for ${file}`
        );
      }
      assert.match(error.message, /pnpm contract:compat:generate/);
      return true;
    }
  );
  assert.deepEqual(snapshotAssets(root), beforeCheck);
  assert.equal(
    fs.readFileSync(path.join(root, "contract/compatibility.json"), "utf8"),
    canonicalSource
  );

  generateCompatibility({ root });
  assert.equal(generateCompatibility({ root, check: true }), 11);
});

test("a canonical edit requires and regenerates all eleven SDK representations", (context) => {
  const root = createWorkspace(context);
  generateCompatibility({ root });
  const previousAssets = snapshotAssets(root);
  const updatedData = JSON.parse(canonicalSource);
  updatedData.timezone.identifiers.push("Test/Generated_Zone");
  const updatedSource = JSON.stringify(updatedData, null, 2) + "\n";
  fs.writeFileSync(
    path.join(root, "contract/compatibility.json"),
    updatedSource
  );

  assert.throws(
    () => generateCompatibility({ root, check: true }),
    (error) => {
      for (const file of allAssets) {
        assert.ok(
          error.message.includes(file),
          `Canonical edit did not invalidate ${file}`
        );
      }
      return true;
    }
  );
  assert.deepEqual(snapshotAssets(root), previousAssets);
  generateCompatibility({ root });
  assert.equal(generateCompatibility({ root, check: true }), 11);
  for (const [index, content] of snapshotAssets(root).entries()) {
    assert.notEqual(
      content,
      previousAssets[index],
      `Canonical edit did not reach ${allAssets[index]}`
    );
    assert.ok(content.toLowerCase().includes("test/generated_zone"));
  }
  assert.equal(
    fs.readFileSync(path.join(root, "contract/compatibility.json"), "utf8"),
    updatedSource
  );
});
