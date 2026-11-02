#!/usr/bin/env node
"use strict";
// An offline tarball consumer proves npm 12 defaults and explicit suppression.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { NPM_VERSION } = require("./preflight.cjs");
const directory = fs.mkdtempSync(
  path.join(os.tmpdir(), "vexilla-npm12-policy-")
);
const run = (args, cwd) =>
  execFileSync("npm", args, { cwd, encoding: "utf8", stdio: "pipe" });
try {
  const npm = run(["--version"], directory).trim();
  assert.equal(npm, NPM_VERSION);
  const dependency = path.join(directory, "dependency");
  fs.mkdirSync(dependency);
  fs.writeFileSync(
    path.join(dependency, "package.json"),
    JSON.stringify({
      name: "vexilla-install-policy-fixture",
      version: "1.0.0",
      scripts: {
        postinstall:
          "node -e \"require('node:fs').writeFileSync('script-ran', 'unexpected')\"",
      },
    })
  );
  const packed = JSON.parse(
    run(["pack", "--ignore-scripts", "--json"], dependency)
  );
  const archive = Object.values(packed)[0].filename;
  for (const ignore of [false, true]) {
    const consumer = path.join(directory, ignore ? "explicit" : "defaults");
    fs.mkdirSync(consumer);
    fs.writeFileSync(
      path.join(consumer, "package.json"),
      JSON.stringify({ name: "policy-consumer", private: true })
    );
    run(
      [
        "install",
        "--offline",
        "--no-audit",
        "--no-fund",
        ...(ignore ? ["--ignore-scripts"] : []),
        path.join(dependency, archive),
      ],
      consumer
    );
    assert(
      fs.existsSync(
        path.join(
          consumer,
          "node_modules/vexilla-install-policy-fixture/package.json"
        )
      )
    );
    assert(
      !fs.existsSync(
        path.join(
          consumer,
          "node_modules/vexilla-install-policy-fixture/script-ran"
        )
      ),
      "Unreviewed dependency lifecycle script ran"
    );
  }
  fs.writeFileSync(
    process.argv[2] || "npm-policy.json",
    JSON.stringify(
      {
        npm,
        defaultScriptsBlocked: true,
        explicitIgnoreScripts: true,
        localTarballConsumer: true,
      },
      null,
      2
    ) + "\n"
  );
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
