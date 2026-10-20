import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { isScheduleActiveWithNow } from "../src/scheduling";
import { VexillaClient } from "../src/client";
const dir = resolve(
  process.env.VEXILLA_CONTRACT_DIR || "../../.contract-artifacts"
);
const read = (name: string) =>
  JSON.parse(readFileSync(resolve(dir, name), "utf8"));
const expected = read("expected.json");

test("shared seed bounds are enforced at ingestion and evaluation", async () => {
  for (const sample of [
    ...expected.seedCases,
    { value: NaN, valid: false },
    { value: Infinity, valid: false },
  ]) {
    const client = new VexillaClient({
      baseUrl: "https://contract",
      environment: "dev",
      customInstanceId: "member",
    } as any);
    await client.syncManifest(async () => read("manifest.json"));
    const group = read("contract-group.json");
    group.environments.dev.features.gradual.seed = sample.value;
    if (sample.valid) {
      client.setFlags(group);
      assert.doesNotThrow(() => client.should(expected.groupId, "gradual"));
    } else {
      assert.throws(() => client.setFlags(group), /seed/);
    }
  }
  const client = new VexillaClient({
    baseUrl: "https://contract",
    environment: "dev",
    customInstanceId: "member",
  } as any);
  await client.syncManifest(async () => read("manifest.json"));
  const group = read("contract-group.json");
  client.setFlags(group);
  group.environments.dev.features.gradual.seed = 0;
  assert.throws(() => client.should(expected.groupId, "gradual"), /seed/);
});
for (const env of expected.environments) {
  for (const names of [false, true]) {
    test(`shared contract ${env.id} ${names ? "names" : "IDs"}`, async () => {
      const client = new VexillaClient({
        baseUrl: "https://contract",
        environment: names ? env.name : env.id,
        customInstanceId: "member",
      } as any);
      const fetch = async (url: string) => read(basename(url));
      await client.syncManifest(fetch);
      const group = names ? expected.groupName : expected.groupId;
      const decoded = await client.getFlags(group, fetch);
      client.setFlags(decoded);
      for (const c of expected.cases) {
        const feature = names ? c.name : c.id;
        assert.equal(
          c.kind === "value"
            ? client.value(group, feature, "fallback")
            : client.should(group, feature, c.instance),
          env[c.expectedKey],
          `${env.id}/${c.id}`
        );
      }
      for (const fid of [...expected.scheduled, "scheduled-active"]) {
        const f = decoded.environments[env.id].features[fid];
        assert.equal(
          isScheduleActiveWithNow(
            f.schedule,
            f.scheduleType,
            expected.referenceClock
          ),
          fid === "scheduled-active"
        );
      }
      for (const fid of expected.scheduled) {
        assert.equal(client.should(group, fid), false);
      }
      assert.equal(
        decoded.environments[env.id].features.gradual.seed,
        env.seed
      );
      assert.equal(
        decoded.environments[env.id].features.gradual.value,
        env.threshold
      );
      assert.equal(decoded.features.gradual.featureType, "gradual");
      assert.equal((decoded.features.gradual as any).seed, 0.5);
      for (const f of Object.values(decoded.environments[env.id].features)) {
        assert.equal(typeof f.schedule.start, "number");
      }
    });
  }
}
