"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const {
  selection,
  source,
  checkPackage,
  createEvidence,
  NPM_VERSION,
} = require("./preflight.cjs");
const { required } = require("../../contract/scripts/gate.cjs");
const { requiredRuntimes } = require("../../contract/scripts/observations.cjs");
const revision = "a".repeat(40);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));

function fixture() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "vexilla-preflight-")
  );
  const contractDirectory = path.join(directory, "contracts");
  const packageDirectory = path.join(directory, "packages");
  fs.mkdirSync(path.join(contractDirectory, "receipts"), { recursive: true });
  const files = {
    "manifest.json": {},
    "contract-group.json": {},
    "compatibility.json": {},
    "expected.json": { environments: [], cases: [], scheduled: [] },
    "parity.json": {
      version: 1,
      hashes: [{ id: "case/one", expected: { value: true } }],
    },
  };
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const bytes = JSON.stringify(value);
    fs.writeFileSync(path.join(contractDirectory, name), bytes);
    hashes[name] = hash(bytes);
  }
  const metadata = { revision, hashes, requiredCaseIds: ["case/one"] };
  write(path.join(contractDirectory, "metadata.json"), metadata);
  for (const sdk of required) {
    write(path.join(contractDirectory, "receipts", sdk + ".json"), {
      ...metadata,
      sdk,
      status: "success",
      coverage: requiredRuntimes(sdk).map((runtime) => ({
        runtime,
        caseIds: metadata.requiredCaseIds,
      })),
    });
  }
  for (const sdk of ["js", "rust", "elixir"]) {
    const output = path.join(packageDirectory, sdk);
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, "package.archive"), "verified bytes");
    write(path.join(output, "verification.json"), {
      schemaVersion: 1,
      kind: "sdk-package-verification",
      sdk,
      revision,
      artifact: "package.archive",
      verification: { package: true, consumer: true, native: true, docs: true },
      toolchains: {
        node: "v24.16.0",
        npm: NPM_VERSION,
        python: "Python 3",
        pnpm: "10.24.0",
        cargo: "cargo 1",
        rustc: "rustc 1",
        elixir: "Elixir 1",
      },
      files: [{ name: "package.archive", sha256: hash("verified bytes") }],
    });
  }
  return {
    directory,
    contractDirectory,
    packageDirectory,
    options: {
      revision,
      sdks: ["js", "rust"],
      runUrl: "https://github.com/Vexilla/vexilla/actions/runs/123",
      runAttempt: "1",
      contractDirectory,
      packageDirectory,
    },
  };
}

test("preflight accepts full SHA and explicit supported selection without activation state", () => {
  assert.deepEqual(selection(revision, "js,rust").matrix.include, [
    { sdk: "js" },
    { sdk: "rust" },
  ]);
  for (const ref of [
    "main",
    "client-js-v2.0.0",
    revision.slice(0, 10),
    "refs/tags/" + revision,
    "A".repeat(40),
  ]) {
    assert.throws(() => selection(ref, "js"), /full immutable/);
  }
  for (const sdks of ["", "js,js", "go", "types", "js,rust,elixir,python"]) {
    assert.throws(() => selection(revision, sdks));
  }
  assert.throws(() => source(revision, "js"), /checkout is not/);
});

test("verification rejects tracked source changes even when HEAD still names the requested commit", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "vexilla-preflight-source-")
  );
  const git = (args) =>
    execFileSync("git", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  try {
    git(["init", "--quiet"]);
    fs.writeFileSync(path.join(directory, "source.txt"), "reviewed source\n");
    git(["add", "source.txt"]);
    git([
      "-c",
      "user.name=Release fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "fixture",
    ]);
    const sha = git(["rev-parse", "HEAD"]);
    assert.equal(source(sha, "js", directory), sha);
    fs.mkdirSync(path.join(directory, ".release-tools"));
    fs.writeFileSync(
      path.join(directory, ".release-tools/tool.txt"),
      "separate tools\n"
    );
    assert.equal(source(sha, "js", directory), sha);
    fs.appendFileSync(
      path.join(directory, "source.txt"),
      "unreviewed change\n"
    );
    assert.throws(() => source(sha, "js", directory));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("hosted evidence includes all eleven receipts, selected packages, toolchains, hashes and run identity", () => {
  const f = fixture();
  try {
    const evidence = createEvidence(f.options);
    assert.equal(evidence.kind, "sdk-preflight");
    assert.equal(evidence.publicationAuthorized, false);
    assert.equal(evidence.contract.receipts.length, 11);
    assert.deepEqual(
      evidence.packages.map((p) => p.sdk),
      ["js", "rust"]
    );
    assert.equal(evidence.revision, revision);
    assert.equal(evidence.runUrl, f.options.runUrl);
    assert.equal(evidence.runAttempt, 1);
    assert(
      evidence.packages.every(
        (p) => p.toolchains.npm === NPM_VERSION && p.files[0].sha256
      )
    );
  } finally {
    fs.rmSync(f.directory, { recursive: true, force: true });
  }
});

for (const issue of [
  "missing contract",
  "failed contract",
  "stale contract",
  "missing package",
  "stale package",
  "failed consumer",
  "changed bytes",
  "missing toolchain",
  "candidate instead",
  "missing run",
  "missing attempt",
]) {
  test(`preflight refuses ${issue}`, () => {
    const f = fixture();
    try {
      const filename = path.join(f.packageDirectory, "js", "verification.json");
      const receipt = JSON.parse(fs.readFileSync(filename));
      if (issue === "missing contract") {
        fs.unlinkSync(path.join(f.contractDirectory, "receipts/elixir.json"));
      }
      if (issue === "failed contract" || issue === "stale contract") {
        const file = path.join(f.contractDirectory, "receipts/elixir.json");
        const contract = JSON.parse(fs.readFileSync(file));
        if (issue === "failed contract") {
          contract.status = "failure";
        } else {
          contract.revision = "b".repeat(40);
        }
        write(file, contract);
      }
      if (issue === "missing package") {
        fs.unlinkSync(filename);
      }
      if (issue === "stale package") {
        receipt.revision = "b".repeat(40);
      }
      if (issue === "failed consumer") {
        receipt.verification.consumer = false;
      }
      if (issue === "missing toolchain") {
        delete receipt.toolchains.node;
      }
      if (issue === "candidate instead") {
        receipt.kind = "sdk-candidate";
      }
      if (issue === "changed bytes") {
        fs.appendFileSync(
          path.join(f.packageDirectory, "js/package.archive"),
          "changed"
        );
      }
      if (issue === "missing run") {
        delete f.options.runUrl;
      }
      if (issue === "missing attempt") {
        delete f.options.runAttempt;
      }
      if (issue !== "missing package") {
        write(filename, receipt);
      }
      assert.throws(() => createEvidence(f.options));
    } finally {
      fs.rmSync(f.directory, { recursive: true, force: true });
    }
  });
}

test("Elixir package verification requires documentation and any other SHA stays unauthorized", () => {
  const f = fixture();
  try {
    const directory = path.join(f.packageDirectory, "elixir");
    const receipt = JSON.parse(
      fs.readFileSync(path.join(directory, "verification.json"))
    );
    checkPackage(receipt, "elixir", revision, directory);
    receipt.verification.docs = false;
    assert.throws(
      () => checkPackage(receipt, "elixir", revision, directory),
      /docs/
    );
    assert.throws(
      () => checkPackage(receipt, "elixir", "b".repeat(40), directory),
      /stale/
    );
  } finally {
    fs.rmSync(f.directory, { recursive: true, force: true });
  }
});
