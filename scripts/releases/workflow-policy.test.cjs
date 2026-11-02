const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const yaml = require("yaml");
const workflow = (name) =>
  yaml.parse(
    fs.readFileSync(`${__dirname}/../../.github/workflows/${name}.yml`, "utf8")
  );
const uses = (job, action) =>
  job.steps.filter((step) => step.uses?.startsWith(action + "@"));

test("every contract checkout and final evidence gate bind the requested revision", () => {
  const contract = workflow("contract");
  assert(contract.on.workflow_call.inputs.revision);
  assert.equal(contract.jobs.gate.if, "always()");
  assert.deepEqual(contract.jobs.gate.needs, ["producer", "consumers"]);
  for (const job of Object.values(contract.jobs)) {
    for (const checkout of uses(job, "actions/checkout")) {
      assert.equal(checkout.with.ref, "${{ inputs.revision || github.sha }}");
      assert.equal(checkout.with["persist-credentials"], false);
    }
  }
  const gate = contract.jobs.gate.steps.find(
    (step) => step.run === "node contract/scripts/gate.cjs"
  );
  assert.equal(
    gate.env.EXPECTED_REVISION,
    "${{ inputs.revision || github.sha }}"
  );
  assert.equal(gate.env.PRODUCER_RESULT, "${{ needs.producer.result }}");
  assert.equal(gate.env.CONSUMERS_RESULT, "${{ needs.consumers.result }}");
  const inventory = require("../../contract/inventory.json");
  const {
    required,
    checkInventory,
  } = require("../../contract/scripts/gate.cjs");
  checkInventory(inventory);
  assert.equal(inventory.length, required.length);
  assert(inventory.some((sdk) => sdk.id === "lua"));
  const releases = require("../../.github/sdk-release-inventory.json");
  assert(!releases.clients.some((sdk) => ["lua", "dart"].includes(sdk.id)));
});

test("only final publisher can request registry identity; native jobs consume inspected payloads", () => {
  const publish = workflow("sdk-publish");
  assert.equal(publish.concurrency["cancel-in-progress"], false);
  assert.equal(publish.permissions["id-token"], undefined);
  for (const [name, job] of Object.entries(publish.jobs)) {
    if (name !== "publish") {
      assert.equal(job.permissions?.["id-token"], undefined);
      assert(!JSON.stringify(job).includes("secrets."));
    }
  }
  assert.deepEqual(publish.jobs.publish.needs, [
    "identity",
    "contract",
    "package",
  ]);
  assert.equal(publish.jobs.publish.permissions["id-token"], "write");
  assert.equal(
    publish.jobs.contract.with.revision,
    "${{ needs.identity.outputs.revision }}"
  );
  assert.equal(publish.jobs.package.needs.includes("contract"), true);
  for (const name of ["package", "publish"]) {
    assert.equal(
      uses(publish.jobs[name], "actions/checkout")[0].with.ref,
      "${{ needs.identity.outputs.revision }}"
    );
  }
  const steps = publish.jobs.publish.steps;
  const validateIndex = steps.findIndex((step) =>
    step.run?.includes("candidate.cjs verify")
  );
  const credentialIndex = steps.findIndex((step) =>
    step.uses?.startsWith("rust-lang/crates-io-auth-action@")
  );
  assert(validateIndex >= 0 && credentialIndex > validateIndex);
  assert(
    steps.some((step) =>
      step.run?.includes(
        "publish-npm.cjs release-artifacts release-identity.json"
      )
    )
  );
  assert(
    steps.some((step) =>
      step.run?.includes(
        "publish-native.cjs elixir --receipt release-artifacts/receipt.json"
      )
    )
  );
});

test("independent publishers do not cancel each other; recovery cannot create releases", () => {
  const release = workflow("sdk-release");
  assert.equal(release.jobs.publish.strategy["fail-fast"], false);
  assert.match(release.jobs.release.if, /github.event_name == 'push'/);
  assert.match(release.jobs.release.if, /SDK_RELEASES_ENABLED/);
  assert.equal(
    release.jobs.candidates.steps.find((step) => step.id === "select").env
      .RELEASE_CANDIDATES,
    "${{ needs.release.outputs.candidates || '[]' }}"
  );
  assert.equal(
    release.jobs.publish.uses,
    "./.github/workflows/sdk-publish.yml"
  );
  assert.deepEqual(release.on.workflow_dispatch.inputs.sdk.options, [
    "js",
    "elixir",
    "rust",
  ]);
});

test("group failures produce a failing outcome diagnostic without discarding independent candidates", () => {
  const release = workflow("sdk-release");
  assert.equal(
    release.jobs.release.outputs.failures,
    "${{ steps.release.outputs.failures }}"
  );
  assert.equal(release.jobs.outcomes.needs, "release");
  assert.equal(release.jobs.outcomes.name, "SDK release policy outcomes");
  assert.match(release.jobs.outcomes.if, /always\(\)/);
  assert.equal(release.jobs.candidates.needs, "release");
  assert.equal(release.jobs.publish.needs, "candidates");
  const { checkOutcomes } = require("./report-outcomes.cjs");
  assert.doesNotThrow(() => checkOutcomes("success", []));
  assert.throws(() => checkOutcomes("failure", []), /orchestration failure/);
  assert.throws(
    () =>
      checkOutcomes("success", [
        { group: "js-types", phase: "proposals", message: "major 3 rejected" },
      ]),
    /js-types.*major 3 rejected/
  );
});

test("new release workflows pin actions and never interpolate untrusted values into shell code", () => {
  for (const name of [
    "sdk-release",
    "sdk-publish",
    "sdk-release-checks",
    "sdk-pr-title",
    "sdk-preflight",
  ]) {
    const config = workflow(name);
    for (const job of Object.values(config.jobs)) {
      for (const step of job.steps || []) {
        if (step.uses && !step.uses.startsWith("./")) {
          assert(
            /@[a-f0-9]{40}$/.test(step.uses),
            `${name}: unpinned action ${step.uses}`
          );
        }
        if (step.run) {
          assert(
            !step.run.includes("${{"),
            `${name}: expression interpolation in shell`
          );
        }
      }
    }
  }
});

test("preflight and shared package checks have no registry identity, secrets, release writes or publisher environments", () => {
  const preflight = workflow("sdk-preflight");
  const shared = yaml.parse(
    fs.readFileSync(
      `${__dirname}/../../.github/actions/sdk-verify/action.yml`,
      "utf8"
    )
  );
  for (const value of [preflight, shared]) {
    const text = JSON.stringify(value);
    assert(!text.includes("id-token"));
    assert(!text.includes("secrets."));
    assert(!text.includes("candidate.cjs"));
    assert(!text.includes("release-identity.cjs"));
    assert(!text.includes("publish-native.cjs"));
    assert(!text.includes("publish-npm.cjs"));
    assert(!text.includes("environment"));
  }
  assert.deepEqual(preflight.permissions, { contents: "read" });
  assert(preflight.on.workflow_dispatch.inputs.revision.required);
  assert(preflight.on.workflow_dispatch.inputs.sdks.required);
  assert.equal(
    preflight.jobs.contract.uses,
    "./.github/workflows/contract.yml"
  );
  assert.equal(
    preflight.jobs.contract.with.revision,
    "${{ needs.select.outputs.revision }}"
  );
  assert.deepEqual(preflight.jobs.package.needs, ["select", "contract"]);
  assert.deepEqual(preflight.jobs.evidence.needs, [
    "select",
    "contract",
    "package",
  ]);
  assert.equal(preflight.jobs.package.strategy["fail-fast"], false);
  for (const name of ["package", "evidence"]) {
    assert.equal(
      uses(preflight.jobs[name], "actions/checkout")[0].with.ref,
      "${{ needs.select.outputs.revision }}"
    );
    assert(
      preflight.jobs[name].steps
        .filter((s) => s.uses?.startsWith("actions/upload-artifact@"))
        .every((s) => s.with.name.startsWith("sdk-preflight-"))
    );
    const tools = uses(preflight.jobs[name], "actions/checkout").find(
      (s) => s.with.path === ".release-tools"
    );
    assert.equal(
      tools.with.ref,
      "${{ github.sha }}",
      "Requested source cannot replace the reviewed evidence validator"
    );
  }
  const releasePackage = workflow("sdk-publish").jobs.package;
  assert(
    releasePackage.steps.some(
      (s) => s.uses === "./.release-tools/.github/actions/sdk-verify"
    )
  );
  const preflightPackage = preflight.jobs.package.steps.find(
    (s) => s.uses === "./.release-tools/.github/actions/sdk-verify"
  );
  assert(preflightPackage);
  assert.equal(preflightPackage.with["tools-directory"], ".release-tools");
  assert(
    preflight.jobs.evidence.steps.some(
      (s) =>
        s.run === "node .release-tools/scripts/releases/preflight.cjs evidence"
    )
  );
  const steps = shared.runs.steps;
  assert(steps.some((s) => s.run?.includes("contractEvidence")));
  assert(steps.some((s) => s.run?.includes("mix test")));
  assert(steps.some((s) => s.run?.includes("cargo +stable test --locked")));
  assert(
    steps.some((s) => s.run?.includes("pnpm --filter @vexilla/client test"))
  );
  assert(steps.some((s) => s.run?.includes("package-native.py")));
  assert(steps.some((s) => s.run?.includes("check-package.cjs")));
  assert(steps.some((s) => s.run?.includes("preflight-npm-policy.cjs")));
  assert(steps.some((s) => s.run?.includes("npm@12.2.1 --ignore-scripts")));
  assert(!JSON.stringify(shared).includes("dangerously-allow-all-scripts"));
  for (const step of steps) {
    if (step.uses && !step.uses.startsWith("./")) {
      assert(/@[a-f0-9]{40}$/.test(step.uses));
    }
    if (step.run) {
      assert(!step.run.includes("${{"));
    }
  }
});

test("final release checks use current policy tools and rerun all verification at the approved source", () => {
  const publish = workflow("sdk-publish");
  assert.equal(
    publish.jobs.identity.outputs["policy-revision"],
    "${{ steps.identity.outputs.policy-revision }}"
  );
  for (const name of ["package", "publish"]) {
    const job = publish.jobs[name];
    const tools = uses(job, "actions/checkout").find(
      (step) => step.with.path === ".release-tools"
    );
    assert.equal(
      tools.with.ref,
      "${{ needs.identity.outputs.policy-revision }}"
    );
    assert.equal(
      uses(job, "actions/checkout")[0].with.ref,
      "${{ needs.identity.outputs.revision }}"
    );
    assert(
      !JSON.stringify(job).includes("sdk-preflight"),
      "Readiness artifacts cannot supply final candidate bytes"
    );
  }
  const shared = publish.jobs.package.steps.find((s) =>
    s.uses?.endsWith("/.github/actions/sdk-verify")
  );
  assert.equal(shared.with.revision, "${{ needs.identity.outputs.revision }}");
  assert.equal(shared.with["contract-prefix"], "release-${{ inputs.sdk }}");
  const steps = publish.jobs.publish.steps;
  const credentials = steps.findIndex((s) => s.id === "crates");
  assert(
    steps[credentials - 1].run.includes(
      ".release-tools/scripts/releases/release-identity.cjs"
    )
  );
  assert.equal(
    steps[credentials - 1].env.SDK_RELEASES_ENABLED,
    "${{ vars.SDK_RELEASES_ENABLED }}"
  );
  for (const step of steps.filter((s) =>
    /publish-(native|npm)\.cjs/.test(s.run)
  )) {
    assert(step.run.includes(".release-tools/scripts/releases/"));
    assert.equal(step.env.GH_TOKEN, "${{ github.token }}");
    assert.equal(
      step.env.SDK_RELEASES_ENABLED,
      "${{ vars.SDK_RELEASES_ENABLED }}"
    );
  }
});
