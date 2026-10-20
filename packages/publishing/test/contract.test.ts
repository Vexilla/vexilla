import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  serializePublication,
  editorNumber,
  createFeature,
  createEnvironment,
  changeFeatureType,
} from "../src";
import { validatePublication, validateFeature } from "@vexilla/types";
import type { Group } from "@vexilla/types";
const source = JSON.parse(
  readFileSync(
    new URL("../../../contract/authoring.json", import.meta.url),
    "utf8"
  )
);
const saved = JSON.parse(
  readFileSync(
    new URL("../../test-server/fixtures/config.json", import.meta.url),
    "utf8"
  )
);
const fresh = () => structuredClone(source);
const decode = (config = fresh()) => {
  const result = serializePublication(config);
  assert.equal(result.success, true, JSON.stringify(result));
  if (!result.success) {
    throw Error("invalid");
  }
  const manifest = JSON.parse(result.files[0].content);
  const groups = Object.fromEntries(
    result.files
      .slice(1)
      .map((f) => [f.filePath.slice(0, -5), JSON.parse(f.content)])
  );
  return { result, manifest, groups };
};
test("production output is deterministic, complete, immutable and preserves independently specified values", () => {
  const config = fresh(),
    before = structuredClone(config);
  const a = decode(config),
    b = decode(config);
  assert.deepEqual(a, b);
  assert.deepEqual(config, before);
  assert.equal(
    createHash("sha256").update(JSON.stringify(a.result.files)).digest("hex"),
    createHash("sha256").update(JSON.stringify(b.result.files)).digest("hex")
  );
  assert.equal(validatePublication(a.manifest, a.groups).success, true);
  const e = JSON.parse(
    readFileSync(
      new URL("../../../contract/expected.json", import.meta.url),
      "utf8"
    )
  );
  for (const env of e.environments) {
    const fs = a.groups["contract-group"].environments[env.id].features;
    for (const c of e.cases.filter((c: any) => c.kind === "value")) {
      assert.equal(fs[c.id].value, env[c.expectedKey]);
    }
    assert.equal(fs.gradual.seed, env.seed);
    assert.equal(fs.gradual.value, env.threshold);
    assert.equal(fs.toggle.value, env.toggle);
  }
  assert.equal(a.groups["contract-group"].features.gradual.seed, 0.5);
  assert.equal(
    "defaultEnvironmentFeatureValues" in
      a.groups["contract-group"].environments.dev,
    false
  );
});
for (const [name, mutate, path] of [
  [
    "group seed",
    (c: any) => delete c.groups[0].features.gradual.seed,
    "/features/gradual/seed",
  ],
  [
    "environment seed",
    (c: any) => delete c.groups[0].environments.dev.features.gradual.seed,
    "/environments/dev/features/gradual/seed",
  ],
  [
    "feature discriminator",
    (c: any) => (c.groups[0].features.toggle.featureType = "oops"),
    "/features/toggle/featureType",
  ],
  [
    "value discriminator",
    (c: any) => delete c.groups[0].features["value-int"].numberType,
    "/features/value-int/numberType",
  ],
  [
    "scalar type",
    (c: any) => (c.groups[0].features.toggle.value = 0),
    "/features/toggle/value",
  ],
  [
    "list type",
    (c: any) => (c.groups[0].features["selective-string"].value = 42),
    "/features/selective-string/value",
  ],
  [
    "list item type",
    (c: any) => (c.groups[0].features["selective-string"].value = [4]),
    "/features/selective-string/value/0",
  ],
  [
    "null date",
    (c: any) => (c.groups[0].features.toggle.schedule.start = null),
    "/features/toggle/schedule/start",
  ],
  [
    "mismatched ID",
    (c: any) =>
      (c.groups[0].environments.dev.features.toggle.featureId = "wrong"),
    "/environments/dev/features/toggle/featureId",
  ],
  [
    "missing env feature",
    (c: any) => delete c.groups[0].environments.dev.features.toggle,
    "/environments/dev/features/toggle",
  ],
  [
    "subtype mismatch",
    (c: any) =>
      (c.groups[0].environments.dev.features["value-int"].numberType = "float"),
    "/environments/dev/features/value-int/numberType",
  ],
  [
    "ambiguous name",
    (c: any) => (c.groups[0].features.toggle.name = "Gradual"),
    "/features/gradual/name",
  ],
] as const) {
  test(`rejects ${name} with an actionable field path and unchanged input`, () => {
    const c = fresh();
    mutate(c);
    const before = structuredClone(c),
      result = serializePublication(c);
    assert.equal(result.success, false);
    if (result.success) {
      return;
    }
    assert.ok(
      result.issues.some((i) => i.path.endsWith(path)),
      JSON.stringify(result)
    );
    assert.ok(result.issues.every((i) => i.expected && i.repair));
    assert.deepEqual(c, before);
  });
}
test("old malformed saved config is blocked without inventing seeds", () => {
  const before = structuredClone(saved),
    result = serializePublication(saved);
  assert.equal(result.success, false);
  if (result.success) {
    return;
  }
  assert.ok(result.issues.some((i) => i.path.endsWith("/seed")));
  assert.deepEqual(saved, before);
});

test("invalid seeds in either feature map block publication without changing saved values", () => {
  for (const environment of [false, true]) {
    for (const seed of [
      -0.1,
      0,
      1.000001,
      42,
      null,
      true,
      NaN,
      Infinity,
      "0",
      "1.1",
    ]) {
      const config = fresh();
      const feature = environment
        ? config.groups[0].environments.dev.features.gradual
        : config.groups[0].features.gradual;
      feature.seed = seed;
      const before = structuredClone(config);
      const result = serializePublication(config);
      assert.equal(result.success, false, `seed ${String(seed)}`);
      if (!result.success) {
        const path = environment
          ? "/environments/dev/features/gradual/seed"
          : "/features/gradual/seed";
        assert.ok(result.issues.some((issue) => issue.path.endsWith(path)));
      }
      assert.deepEqual(config, before);
    }
  }
});
for (const value of [
  "42oops",
  "",
  "1.5",
  "9007199254740991.1",
  "9007199254740992",
  "NaN",
  "Infinity",
  NaN,
  Infinity,
  42.5,
]) {
  test(`rejects integer ${String(value)}`, () =>
    assert.throws(() => editorNumber(value, true)));
}
test("whole numeric conversion accepts zero, decimal, exponent and exact integers", () => {
  assert.equal(editorNumber("0", true), 0);
  assert.equal(editorNumber("42.00", true), 42);
  assert.equal(editorNumber("4.2e1", true), 42);
  assert.equal(editorNumber(".25", false), 0.25);
  const c = fresh();
  c.groups[0].features["value-int"].value = "42";
  assert.equal(
    decode(c).groups["contract-group"].features["value-int"].value,
    42
  );
});
test("rejects non-finite float and unsafe/fractional numbers before encoding", () => {
  for (const value of [NaN, Infinity, "42oops", "1e999"]) {
    const c = fresh();
    c.groups[0].features["value-float"].value = value;
    assert.equal(serializePublication(c).success, false);
  }
  for (const value of [42.5, 9007199254740992]) {
    const c = fresh();
    c.groups[0].features["value-int"].value = value;
    assert.equal(serializePublication(c).success, false);
  }
});
test("canonical validator rejects unsupported versions and file disagreement, tolerates extra fields", () => {
  const { manifest, groups } = decode();
  manifest.version = "v2";
  assert.ok(
    validatePublication(manifest, groups).issues.some(
      (i) => i.path === "/manifest/version"
    )
  );
  manifest.version = "v1";
  groups["contract-group"].meta.version = "v0";
  assert.ok(
    validatePublication(manifest, groups).issues.some((i) =>
      i.path.endsWith("/meta/version")
    )
  );
  groups["contract-group"].meta.version = "v1";
  manifest.groups[0].name = "wrong";
  assert.equal(validatePublication(manifest, groups).success, false);
  manifest.groups[0].name = "Contract";
  groups["contract-group"].extra = true;
  assert.equal(validatePublication(manifest, groups).success, true);
  delete groups["contract-group"];
  assert.equal(validatePublication(manifest, groups).success, false);
});
const shapes = [
  { featureType: "toggle" },
  { featureType: "gradual" },
  ...["selective", "value"].flatMap((featureType) => [
    { featureType, valueType: "string" },
    ...["int", "float"].map((numberType) => ({
      featureType,
      valueType: "number",
      numberType,
    })),
  ]),
] as any[];
for (const shape of shapes) {
  test(`constructs complete ${JSON.stringify(
    shape
  )} and preserves metadata when adding environments`, () => {
    const f = createFeature({ featureId: "actual-id", name: "Actual" }, shape);
    assert.deepEqual(validateFeature(f), []);
    const group: Group = {
      groupId: "g",
      name: "G",
      features: { "actual-id": f },
      environments: {},
    };
    const env = createEnvironment(group, "e", "E");
    assert.deepEqual(validateFeature(env.features["actual-id"]), []);
    assert.equal(env.features["actual-id"].featureId, "actual-id");
    assert.equal(env.features["actual-id"].name, "Actual");
    assert.equal(
      (env.features["actual-id"] as any).numberType,
      shape.numberType
    );
  });
}
test("toggle-to-gradual replaces obsolete fields and works with zero or multiple environments", () => {
  for (const withEnv of [false, true]) {
    const group: Group = {
      groupId: "g",
      name: "G",
      features: {
        f: createFeature({ featureId: "f", name: "F", scheduleType: "global" }),
      },
      environments: {},
    };
    if (withEnv) {
      group.environments.e = createEnvironment(group, "e", "E");
    }
    changeFeatureType(group, "f", { featureType: "gradual" });
    assert.deepEqual(validateFeature(group.features.f), []);
    assert.equal(group.features.f.name, "F");
    assert.equal(group.features.f.scheduleType, "global");
    if (withEnv) {
      assert.deepEqual(validateFeature(group.environments.e.features.f), []);
    }
    changeFeatureType(group, "f", { featureType: "toggle" });
    assert.equal("seed" in group.features.f, false);
    assert.equal(serializePublication({ groups: [group] }).success, true);
  }
});

test("corpus editing action reproduces the real UI toggle-to-gradual flow", async () => {
  const { applyContractActions } = await import("../../../contract/actions");
  const actions = JSON.parse(
    readFileSync(
      new URL("../../../contract/editing-actions.json", import.meta.url),
      "utf8"
    )
  );
  const input = fresh();
  assert.equal(input.groups[0].features.regression.featureType, "toggle");
  applyContractActions(input, actions);
  const { groups } = decode(input);
  const g = groups["contract-group"];
  assert.equal(g.features.regression.featureType, "gradual");
  assert.equal(g.features.regression.seed, 0.5);
  assert.equal(g.environments.dev.features.regression.seed, 0.5);
  assert.equal(g.environments.prod.features.regression.seed, 0.5);
});

test("manifest duplicates, map identities, extra references and normalized name collisions are rejected", () => {
  const { manifest, groups } = decode();
  const mutations = [
    (m: any, g: any) => m.groups.push({ ...m.groups[0] }),
    (m: any, g: any) => (g["contract-group"].groupId = "wrong"),
    (m: any, g: any) =>
      (g["contract-group"].environments.dev.environmentId = "wrong"),
    (m: any, g: any) =>
      (g["contract-group"].features.toggle.featureId = "wrong"),
    (m: any, g: any) =>
      (g["contract-group"].features.toggle.name = "selective string"),
    (m: any, g: any) =>
      (g["contract-group"].environments.dev.features.extra =
        g["contract-group"].features.toggle),
    (m: any, g: any) =>
      (g["contract-group"].environments.prod.name = "Development"),
  ];
  for (const mutate of mutations) {
    const m = structuredClone(manifest),
      g = structuredClone(groups);
    mutate(m, g);
    assert.equal(validatePublication(m, g).success, false);
  }
  const c = fresh();
  c.groups[0].groupId = "manifest";
  assert.equal(serializePublication(c).success, false);
  c.groups[0].groupId = "../escape";
  assert.equal(serializePublication(c).success, false);
});

test("timezone repairs identify invalid IANA timezones", () => {
  const input = fresh();
  input.groups[0].features.toggle.schedule.timezone = "invalid/zone";
  const r = serializePublication(input);
  assert.equal(r.success, false);
  if (!r.success) {
    assert.ok(r.issues.some((i) => i.path.endsWith("/schedule/timezone")));
  }
});

test("escaped JSON pointers retain usable feature identities for repair navigation", () => {
  const input = fresh(),
    id = "feature/with~escape";
  const f = createFeature(
    { featureId: id, name: "Escaped" },
    { featureType: "gradual" }
  );
  input.groups[0].features[id] = f;
  for (const env of Object.values(input.groups[0].environments) as any[]) {
    env.features[id] = structuredClone(f);
  }
  delete input.groups[0].features[id].seed;
  const result = serializePublication(input);
  assert.equal(result.success, false);
  if (!result.success) {
    const issue = result.issues.find((i) =>
      i.path.endsWith("/features/feature~1with~0escape/seed")
    );
    assert.equal(issue?.featureId, id);
  }
});

test("manifest name collisions identify the actual group to repair", () => {
  const input = fresh();
  const other = structuredClone(input.groups[0]);
  other.groupId = "other-group";
  input.groups.push(other);
  const result = serializePublication(input);
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(
      result.issues.find((i) => i.path === "/manifest/groups/1/name")?.groupId,
      "other-group"
    );
  }
});

test("explicit type changes preserve each environment scheduling choice and dates", () => {
  const f = createFeature({
    featureId: "f",
    name: "F",
    scheduleType: "global",
  });
  const group: Group = {
    groupId: "g",
    name: "G",
    features: { f },
    environments: {},
  };
  group.environments.e = createEnvironment(group, "e", "E");
  group.environments.e.features.f.scheduleType = "environment";
  group.environments.e.features.f.schedule.start = 1234;
  changeFeatureType(group, "f", { featureType: "gradual" });
  assert.equal(group.features.f.scheduleType, "global");
  assert.equal(group.environments.e.features.f.scheduleType, "environment");
  assert.equal(group.environments.e.features.f.schedule.start, 1234);
  assert.equal(serializePublication({ groups: [group] }).success, true);
});
