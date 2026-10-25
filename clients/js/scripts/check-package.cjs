#!/usr/bin/env node
// Verify the exact npm candidate outside the workspace. No publishing credentials needed.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const artifact = process.argv[2] && path.resolve(process.argv[2]);
const baseline = process.argv.includes("--baseline");
assert.ok(
  artifact && fs.statSync(artifact).isFile(),
  "Usage: node scripts/check-package.cjs <candidate.tgz> [--baseline]"
);
const root = path.resolve(__dirname, "../../..");
const fixtures = path.resolve(__dirname, "../test/package-consumer");
const consumer = fs.mkdtempSync(
  path.join(os.tmpdir(), "vexilla-npm-consumer-")
);
function run(command, args) {
  return execFileSync(command, args, {
    cwd: consumer,
    stdio: "pipe",
    encoding: "utf8",
  });
}
try {
  const files = execFileSync("tar", ["-tzf", artifact], { encoding: "utf8" })
    .trim()
    .split("\n");
  for (const required of [
    "package/package.json",
    "package/LICENSE",
    "package/README.md",
    "package/dist/index.js",
    "package/dist/index.d.ts",
  ]) {
    assert.ok(files.includes(required), `npm candidate is missing ${required}`);
  }
  assert.ok(
    files.every((file) =>
      /^package\/(?:dist\/|package\.json$|README\.(?:md|toml)$|LICENSE$)/.test(
        file
      )
    ),
    "Unexpected files in npm candidate"
  );
  fs.writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify({ name: "vexilla-isolated-consumer", private: true })
  );
  // A temp npm cache prevents sibling node_modules or pnpm workspace links from satisfying dependencies.
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--cache",
    path.join(consumer, ".npm-cache"),
    artifact,
  ]);
  const installed = path.join(consumer, "node_modules/@vexilla/client");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(installed, "package.json"), "utf8")
  );
  assert.equal(manifest.name, "@vexilla/client");
  for (const [name, version] of Object.entries(manifest.dependencies || {})) {
    assert.ok(
      !/vexilla/.test(name),
      `Unexpected SDK runtime dependency ${name}`
    );
    assert.ok(
      !/^(?:workspace:|file:|link:)/.test(version),
      `Non-registry dependency ${name}`
    );
  }
  for (const file of fs.readdirSync(path.join(installed, "dist"))) {
    if (!/\.(?:js|mjs|cjs|d\.ts)$/.test(file)) {
      continue;
    }
    const source = fs.readFileSync(path.join(installed, "dist", file), "utf8")
      .replace(/^\s*\/\/.*$/gm, "");
    // Bundled module labels may name workspace files. Only actual module
    // imports would require private packages or files outside the tarball.
    assert.ok(
      !/\b(?:(?:from|import)\s*|(?:require|import)\s*\(\s*)["'][^"']*(?:@vexilla\/(?:types|publishing)|packages\/(?:types|publishing)|apps\/app)/.test(
        source
      ),
      `Workspace/publisher leak in ${file}`
    );
  }
  const consumerFiles = baseline
    ? ["compatibility.ts"]
    : ["compatibility-v2.ts", "api.ts"];
  for (const file of consumerFiles) {
    fs.copyFileSync(path.join(fixtures, file), path.join(consumer, file));
  }
  const compiler = require.resolve("typescript/bin/tsc", {
    paths: [path.join(root, "clients/js")],
  });
  run(process.execPath, [
    compiler,
    "--noEmit",
    "--strict",
    "--target",
    "ES2020",
    "--module",
    "Node16",
    "--moduleResolution",
    "Node16",
    ...consumerFiles,
  ]);
  const runtime = `
    const assert = require("node:assert/strict");
    const { VexillaClient } = require("@vexilla/client");
    assert.equal(typeof VexillaClient, "function");
    const client = new VexillaClient({ baseUrl: "https://example.test", environment: "dev" });
    const schedule = { start: 0, end: 0, startTime: 0, endTime: 0, timezone: "UTC", timeType: "none" };
    const f = { name: "Enabled", featureId: "f", featureType: "toggle", scheduleType: "", schedule, value: true };
    client.setManifest({ version: "v1", groups: [{ name: "Group", groupId: "g" }] });
    client.setFlags({ name: "Group", groupId: "g", meta: { version: "v1" }, features: { f }, environments: { dev: { name: "Development", environmentId: "dev", features: { f } } } });
    assert.equal(client.should("g", "f"), true);
    assert.equal(client.should("group", "enabled"), true);
  `;
  fs.writeFileSync(path.join(consumer, "runtime.cjs"), runtime);
  run(process.execPath, ["runtime.cjs"]);
  fs.writeFileSync(
    path.join(consumer, "runtime.mjs"),
    'import { VexillaClient } from "@vexilla/client"; if (typeof VexillaClient !== "function") { throw Error("Missing ESM runtime export"); }'
  );
  run(process.execPath, ["runtime.mjs"]);
  console.log(
    JSON.stringify(
      {
        package: manifest.name,
        version: manifest.version,
        artifact,
        sha256: createHash("sha256")
          .update(fs.readFileSync(artifact))
          .digest("hex"),
        fileCount: files.length,
        checks: [
          "contents",
          "runtime CommonJS",
          "runtime ESM",
          ...consumerFiles,
        ],
        result: "passed",
      },
      null,
      2
    )
  );
} catch (error) {
  if (error.stdout) {
    process.stderr.write(error.stdout);
  }
  if (error.stderr) {
    process.stderr.write(error.stderr);
  }
  throw error;
} finally {
  fs.rmSync(consumer, { recursive: true, force: true });
}
