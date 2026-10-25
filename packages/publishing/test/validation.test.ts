import test from "node:test";
import assert from "node:assert/strict";
import {
  validateManifest,
  validateGroup,
  validateFeature,
} from "../src/validation";
import { readFileSync } from "node:fs";
test("missing top-level fields report stable JSON pointers", () => {
  assert.ok(
    validateManifest({ version: "v1" }, "/manifest").some(
      (i) => i.path === "/manifest/groups"
    )
  );
  assert.ok(
    validateGroup({ name: "G" }, "/groups/g").some(
      (i) => i.path === "/groups/g/groupId"
    )
  );
});

test("gradual seeds must be JSON numbers in (0, 1]", () => {
  const source = JSON.parse(
    readFileSync(
      new URL("../../../contract/authoring.json", import.meta.url),
      "utf8"
    )
  );
  const expected = JSON.parse(
    readFileSync(
      new URL("../../../contract/expected.json", import.meta.url),
      "utf8"
    )
  );
  const feature = source.groups[0].features.gradual;
  for (const sample of [
    ...expected.seedCases,
    { value: NaN, valid: false },
    { value: Infinity, valid: false },
  ]) {
    const issues = validateFeature({ ...feature, seed: sample.value });
    assert.equal(
      issues.length === 0,
      sample.valid,
      `seed ${String(sample.value)}`
    );
    if (!sample.valid) {
      assert.ok(issues.some((issue) => issue.path === "/seed"));
    }
  }
});

test("the existing gradual SDK fixture has valid group and environment seeds", () => {
  const group = JSON.parse(
    readFileSync(
      new URL(
        "../../test-server/fixtures/aKS-wxK2mMbeYxVVFSV8p.json",
        import.meta.url
      ),
      "utf8"
    )
  );
  assert.deepEqual(validateGroup(group), []);
});
