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

test("new release workflows pin actions and never interpolate untrusted values into shell code", () => {
  for (const name of [
    "sdk-release",
    "sdk-publish",
    "sdk-release-checks",
    "sdk-pr-title",
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
