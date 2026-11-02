#!/usr/bin/env node
"use strict";
// Readiness evidence has no release identity and is never an upload candidate.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const {
  verifyArtifacts,
  checkGate,
  required,
} = require("../../contract/scripts/gate.cjs");
const SHA = /^[a-f0-9]{40}$/;
const NPM_VERSION = "12.2.1";
const SUPPORTED = ["js", "elixir", "rust"];
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const digest = (file) =>
  createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const write = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

function selection(revision, sdks) {
  assert(
    SHA.test(revision || ""),
    "Preflight requires a full immutable commit SHA"
  );
  const selected =
    typeof sdks === "string" ? sdks.split(",").map((id) => id.trim()) : sdks;
  assert(
    Array.isArray(selected) &&
      selected.length &&
      selected.length <= SUPPORTED.length,
    "Select one or more supported SDKs"
  );
  assert(
    new Set(selected).size === selected.length &&
      selected.every((id) => SUPPORTED.includes(id)),
    "Only js, elixir, rust package verification is implemented"
  );
  return {
    revision,
    sdks: selected,
    matrix: { include: selected.map((sdk) => ({ sdk })) },
  };
}

function source(revision, sdk, root = process.cwd()) {
  selection(revision, [sdk]);
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  assert.equal(
    head,
    revision,
    "Verification checkout is not the requested immutable revision"
  );
  execFileSync("git", ["diff", "--exit-code", "HEAD", "--"], {
    cwd: root,
    stdio: "pipe",
  });
  return head;
}

function contractEvidence(directory, revision) {
  const metadata = verifyArtifacts(directory);
  const receipts = fs
    .readdirSync(path.join(directory, "receipts"))
    .filter((name) => name.endsWith(".json"))
    .map((name) => read(path.join(directory, "receipts", name)));
  checkGate(
    require("../../contract/inventory.json"),
    metadata,
    receipts,
    "success",
    "success",
    revision
  );
  return { metadata, receipts };
}

function toolchains(sdk) {
  const run = (command, args) =>
    execFileSync(command, args, { encoding: "utf8" }).trim();
  const tools = {
    node: process.version,
    npm: run("npm", ["--version"]),
    python: run("python3", ["--version"]),
  };
  assert.equal(tools.npm, NPM_VERSION, "Use the reviewed OIDC-capable npm CLI");
  if (sdk === "js") {
    tools.pnpm = run("pnpm", ["--version"]);
  }
  if (sdk === "rust") {
    tools.rustc = run("rustc", ["--version"]);
    tools.cargo = run("cargo", ["--version"]);
  }
  if (sdk === "elixir") {
    tools.elixir = run("elixir", ["--version"]);
  }
  return tools;
}

function verifyFiles(files, directory) {
  assert(
    Array.isArray(files) &&
      files.length &&
      new Set(files.map((f) => f.name)).size === files.length,
    "Missing or duplicate verified package files"
  );
  for (const file of files) {
    assert(
      /^[A-Za-z0-9_.-]+$/.test(file.name) && ![".", ".."].includes(file.name),
      "Invalid evidence filename"
    );
    assert(
      fs.lstatSync(path.join(directory, file.name)).isFile(),
      "Evidence must identify regular files"
    );
    assert.equal(
      digest(path.join(directory, file.name)),
      file.sha256,
      "Evidence artifact digest mismatch"
    );
  }
}

function checkPackage(receipt, sdk, revision, directory) {
  assert.equal(
    receipt.schemaVersion,
    1,
    "Unsupported package verification evidence"
  );
  assert.equal(
    receipt.kind,
    "sdk-package-verification",
    "A release candidate cannot substitute for package verification"
  );
  assert.equal(receipt.sdk, sdk);
  assert.equal(receipt.revision, revision, "Package evidence is stale");
  assert.equal(receipt.toolchains?.npm, NPM_VERSION);
  for (const tool of [
    "node",
    "python",
    ...(sdk === "js"
      ? ["pnpm"]
      : sdk === "rust"
      ? ["cargo", "rustc"]
      : ["elixir"]),
  ]) {
    assert(
      typeof receipt.toolchains[tool] === "string" && receipt.toolchains[tool],
      "Missing toolchain: " + tool
    );
  }
  for (const check of [
    "package",
    "consumer",
    "native",
    ...(sdk === "elixir" ? ["docs"] : []),
  ]) {
    assert.equal(
      receipt.verification?.[check],
      true,
      "Incomplete package verification: " + check
    );
  }
  verifyFiles(receipt.files, directory);
  assert(
    receipt.files.some((file) => file.name === receipt.artifact),
    "Missing package archive"
  );
  return receipt;
}

function recordPackage(sdk, revision, directory, tools = toolchains(sdk)) {
  source(revision, sdk);
  let packageReceipt, files, artifact;
  if (sdk === "js") {
    packageReceipt = read(path.join(directory, "js-consumer.json"));
    assert.equal(packageReceipt.result, "passed");
    assert.equal(packageReceipt.package, "@vexilla/client");
    const archives = fs
      .readdirSync(directory)
      .filter((name) => name.endsWith(".tgz"));
    assert.equal(archives.length, 1, "Expected one isolated npm tarball");
    artifact = archives[0];
    assert.equal(packageReceipt.sha256, digest(path.join(directory, artifact)));
    files = [artifact, "js-consumer.json", "npm-policy.json"];
    const policy = read(path.join(directory, "npm-policy.json"));
    assert.equal(policy.npm, NPM_VERSION);
    assert.equal(policy.defaultScriptsBlocked, true);
    assert.equal(policy.explicitIgnoreScripts, true);
    packageReceipt.verification = { package: true, consumer: true };
  } else {
    packageReceipt = read(path.join(directory, "receipt.json"));
    assert.equal(packageReceipt.sdk, sdk);
    assert.equal(packageReceipt.revision, revision);
    artifact = packageReceipt.artifact;
    assert.equal(packageReceipt.sha256, digest(path.join(directory, artifact)));
    files = [
      artifact,
      "receipt.json",
      ...(packageReceipt.docs ? [packageReceipt.docs.artifact] : []),
    ];
  }
  const receipt = {
    schemaVersion: 1,
    kind: "sdk-package-verification",
    sdk,
    revision,
    package: packageReceipt.package,
    version: packageReceipt.version,
    artifact,
    verification: { ...packageReceipt.verification, native: true },
    toolchains: tools,
    files: files.map((name) => ({
      name,
      sha256: digest(path.join(directory, name)),
    })),
  };
  checkPackage(receipt, sdk, revision, directory);
  write(path.join(directory, "verification.json"), receipt);
  return receipt;
}

function createEvidence({
  revision,
  sdks,
  runUrl,
  runAttempt,
  contractDirectory,
  packageDirectory,
}) {
  selection(revision, sdks);
  assert(
    /^https:\/\/github\.com\/Vexilla\/vexilla\/actions\/runs\/[1-9]\d*$/.test(
      runUrl || ""
    ),
    "Missing immutable hosted run URL"
  );
  assert(/^[1-9]\d*$/.test(String(runAttempt)), "Missing hosted run attempt");
  const contract = contractEvidence(contractDirectory, revision);
  const packages = sdks.map((sdk) => {
    const directory = path.join(packageDirectory, sdk);
    return checkPackage(
      read(path.join(directory, "verification.json")),
      sdk,
      revision,
      directory
    );
  });
  return {
    schemaVersion: 1,
    kind: "sdk-preflight",
    publicationAuthorized: false,
    revision,
    runUrl,
    runAttempt: Number(runAttempt),
    contract: { metadata: contract.metadata, receipts: contract.receipts },
    packages,
  };
}

module.exports = {
  SHA,
  NPM_VERSION,
  SUPPORTED,
  selection,
  source,
  contractEvidence,
  checkPackage,
  recordPackage,
  createEvidence,
};
if (require.main === module) {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "select") {
    const result = selection(
      process.env.PREFLIGHT_REVISION,
      process.env.PREFLIGHT_SDKS
    );
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `revision=${result.revision}\nmatrix=${JSON.stringify(
        result.matrix
      )}\nsdks=${result.sdks.join(",")}\n`
    );
  } else if (mode === "source") {
    source(process.env.VERIFY_REVISION, process.env.VERIFY_SDK);
    fs.rmSync("release-artifacts", { recursive: true, force: true });
    fs.mkdirSync("release-artifacts");
  } else if (mode === "package") {
    recordPackage(
      process.env.VERIFY_SDK,
      process.env.VERIFY_REVISION,
      "release-artifacts"
    );
  } else if (mode === "evidence") {
    source(
      process.env.PREFLIGHT_REVISION,
      selection(process.env.PREFLIGHT_REVISION, process.env.PREFLIGHT_SDKS)
        .sdks[0]
    );
    const result = createEvidence({
      revision: process.env.PREFLIGHT_REVISION,
      sdks: selection(
        process.env.PREFLIGHT_REVISION,
        process.env.PREFLIGHT_SDKS
      ).sdks,
      runUrl: process.env.PREFLIGHT_RUN_URL,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT,
      contractDirectory: ".contract-artifacts",
      packageDirectory: "preflight-packages",
    });
    write("preflight-evidence.json", result);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        `Credential-free SDK preflight: ${result.runUrl} (attempt ${
          result.runAttempt
        })\n\nRevision: ${result.revision}\n\nAll ${
          required.length
        } contracts and ${result.packages
          .map((p) => p.sdk)
          .join(
            ", "
          )} package checks passed. This evidence does not authorize publication.\n`
      );
    }
  } else {
    throw Error("Unknown preflight mode: " + mode);
  }
}
