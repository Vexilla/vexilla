import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { normalizeName } from "@vexilla/types";
import { VexillaClient } from "../src/client";
import { VexillaError } from "../src/errors";
import { hashFnv32a, hashString } from "../src/hasher";
import { isScheduleActiveWithNow } from "../src/scheduling";
const {
  mutate,
  readVectors,
} = require("../../../contract/scripts/vectors.cjs");
const dir = resolve(
  process.env.VEXILLA_CONTRACT_DIR || "../../.contract-artifacts"
);
const read = (name: string) =>
  JSON.parse(readFileSync(resolve(dir, name), "utf8"));
const expected = read("expected.json");
const parity = read("parity.json");
const observations: { caseId: string; outcome: unknown }[] = [];
const client = (environment = "prod", instance: any = "member") =>
  new VexillaClient({
    baseUrl: "https://contract",
    environment,
    customInstanceId: instance,
  });
const fetch = async (url: string) => read(basename(url));
async function outcome(fn: () => unknown | Promise<unknown>) {
  try {
    const result = await fn();
    return { value: result === undefined ? null : result };
  } catch (error) {
    if (!(error instanceof VexillaError)) {
      throw error;
    }
    return { error: error.kind };
  }
}
function observe(id: string, value: unknown) {
  observations.push({ caseId: id, outcome: value });
}
async function installed(environment = "prod", instance: any = "member") {
  const c = client(environment, instance);
  await c.syncManifest(fetch);
  await c.syncFlags(expected.groupId, fetch);
  return c;
}

test("complete production-path shared contract", async () => {
  for (const sample of parity.hashes) {
    observe(sample.id, { value: hashFnv32a(sample.text) });
  }
  for (const sample of parity.numbers) {
    const text = String(sample.instance);
    observe(sample.id, { value: { text, hash: hashFnv32a(text) } });
  }
  for (const sample of parity.gradual) {
    const c = client();
    await c.syncManifest(fetch);
    const group = read("contract-group.json");
    Object.assign(group.environments.prod.features.gradual, {
      seed: sample.seed,
      value: sample.threshold,
    });
    c.setFlags(group);
    observe(sample.id, {
      value: {
        bucket: hashString(String(sample.instance), sample.seed),
        enabled: c.should(expected.groupId, "gradual", sample.instance),
      },
    });
  }
  for (const sample of parity.schedules) {
    observe(sample.id, {
      value: isScheduleActiveWithNow(
        sample.schedule,
        sample.scheduleType,
        sample.now
      ),
    });
  }
  for (const sample of parity.validation) {
    // Both direct and fetched ingestion must agree. No serialization round-trip
    // is allowed here: it would repair native nonfinite values into JSON nulls.
    const results = [];
    for (const fetched of [false, true]) {
      results.push(
        await outcome(async () => {
          const c = client();
          const source = {
            manifest: read("manifest.json"),
            groups: { [expected.groupId]: read("contract-group.json") },
          };
          mutate(source, sample.mutations);
          if (fetched) {
            await c.syncManifest(async () => source.manifest);
          } else {
            await c.setManifest(source.manifest);
          }
          for (const [id, group] of Object.entries(source.groups)) {
            if (fetched) {
              await c.syncFlags(id, async () => group as any);
            } else {
              c.setFlags(group as any);
            }
          }
          return true;
        })
      );
    }
    assert.deepEqual(results[0], results[1], sample.id + "/ingestion-paths");
    observe(sample.id, results[0]);
  }
  for (const sample of parity.operations) {
    const clients: Record<string, VexillaClient> = Object.create(null);
    const data: Record<string, any> = Object.create(null);
    const results = [];
    for (const step of sample.steps) {
      results.push(
        await outcome(async () => {
          const c = clients[step.client];
          const callback = async () => {
            if (step.callback.throws) {
              throw new Error("Deliberate transport failure");
            }
            return step.callback.file
              ? read(step.callback.file)
              : data[step.callback.data];
          };
          switch (step.op) {
            case "load":
              data[step.as] = read(step.file);
              return;
            case "new":
              clients[step.client] = client(step.environment, step.instance);
              return;
            case "mutate":
              mutate(data[step.data], step.mutations);
              return;
            case "setManifest":
              await c.setManifest(data[step.data]);
              return;
            case "setFlags":
              c.setFlags(data[step.data]);
              return;
            case "getManifest":
              data[step.as] = await c.getManifest(callback);
              return;
            case "getFlags":
              data[step.as] = await c.getFlags(step.group, callback);
              return;
            case "syncManifest":
              await c.syncManifest(callback);
              return;
            case "syncFlags":
              await c.syncFlags(step.group, callback);
              return;
            case "should":
              return c.should(step.group, step.feature, step.instance);
            case "value":
              return c.value(step.group, step.feature, step.default);
            default:
              throw new Error("Unknown operation: " + step.op);
          }
        })
      );
    }
    observe(sample.id, { value: results });
  }
  for (const sample of parity.aliases) {
    observe(sample.id, { value: normalizeName(sample.name) });
  }
  for (const sample of parity.timezones) {
    const c = client();
    await c.syncManifest(fetch);
    const group = read("contract-group.json");
    group.features.toggle.schedule.timezone = sample.timezone;
    const result = await outcome(() => {
      c.setFlags(group);
      return true;
    });
    if ("error" in result) {
      assert.equal(result.error, "validation");
    }
    observe(sample.id, { value: "value" in result });
  }
  for (const env of expected.environments) {
    for (const lookup of ["id", "name", "alias"]) {
      const name = (id: string, label: string) =>
        lookup === "id" ? id : lookup === "name" ? label : normalizeName(label);
      const c = await installed(name(env.id, env.name));
      const group = name(expected.groupId, expected.groupName);
      for (const [index, sample] of expected.cases.entries()) {
        const feature = name(sample.id, sample.name);
        observe(
          `publication/${env.id}/${lookup}/${index}`,
          await outcome(() =>
            sample.kind === "value"
              ? c.value(group, feature, "fallback")
              : c.should(group, feature, sample.instance)
          )
        );
      }
      const decoded = read("contract-group.json");
      for (const id of [...expected.scheduled, "scheduled-active"]) {
        const f = decoded.environments[env.id].features[id];
        observe(`publication/${env.id}/${lookup}/schedule/${id}`, {
          value: isScheduleActiveWithNow(
            f.schedule,
            f.scheduleType,
            expected.referenceClock
          ),
        });
      }
    }
  }
  const byId = new Map(observations.map((o) => [o.caseId, o.outcome]));
  for (const sample of readVectors(dir)) {
    assert.deepEqual(byId.get(sample.id), sample.expected, sample.id);
  }
  assert.equal(byId.size, readVectors(dir).length);
  if (process.env.VEXILLA_OBSERVATIONS_FILE) {
    writeFileSync(
      process.env.VEXILLA_OBSERVATIONS_FILE,
      JSON.stringify({
        protocol: 1,
        sdk: "js",
        runs: [{ runtime: "native", observations }],
      })
    );
  }
});

test("safe wrappers retain documented fallbacks and snapshots resist caller mutation", async () => {
  const c = await installed();
  const group = await c.getFlags(expected.groupId, fetch);
  c.setFlags(group);
  group.environments.prod.features.gradual.seed = 0;
  assert.equal(c.should(expected.groupId, "gradual", "232"), true);
  assert.equal(c.safeShould("missing", "toggle"), false);
  assert.equal(c.safeValue("missing", "value-int", 123), 123);
});

test("malformed Unicode IDs fail before inactive schedules", async () => {
  const c = await installed();
  const group = await c.getFlags(expected.groupId, fetch);
  group.environments.prod.features.gradual.scheduleType = "global";
  group.environments.prod.features.gradual.schedule.start = 0;
  group.environments.prod.features.gradual.schedule.end = 0;
  c.setFlags(group);
  for (const instance of ["\ud800", "\udfff", "x\ud800y"]) {
    assert.throws(() => c.should(expected.groupId, "gradual", instance), (error: VexillaError) => error.kind === "instance");
  }
});
