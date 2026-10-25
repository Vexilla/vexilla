import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as contract from "../src";

test("schema data is available without publication behavior", () => {
  for (const name of ["manifest", "group", "feature", "schedule"] as const) {
    const source = JSON.parse(
      readFileSync(
        new URL(`../schema/v1/${name}.json`, import.meta.url),
        "utf8"
      )
    );
    assert.deepEqual(contract[`${name}Schema`], source);
  }
  assert.equal("validatePublication" in contract, false);
  assert.equal("ContractIssue" in contract, false);
});
