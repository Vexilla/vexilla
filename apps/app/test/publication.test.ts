import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  publishApprovedChanges,
  approvedConfig,
} from "../src/utils/publication";
const source = JSON.parse(
  readFileSync(
    new URL("../../../contract/authoring.json", import.meta.url),
    "utf8"
  )
);
const config = () =>
  ({
    ...structuredClone(source),
    modifiedAt: 0,
    hosting: {
      provider: "github",
      providerType: "git",
      accessToken: "private-token",
    },
  } as any);
test("an invalid group blocks the whole batch; explicit repair enables one scrubbed batch", async () => {
  const c = config();
  const good = structuredClone(c.groups[0]);
  good.groupId = "other";
  good.name = "Other";
  c.groups.push(good);
  delete c.groups[0].features.gradual.seed;
  const before = structuredClone(c);
  const writes: any[] = [];
  const write = async (files: any[]) => {
    writes.push(files);
  };
  const bad = await publishApprovedChanges(c, [], {}, write);
  assert.equal(bad.success, false);
  assert.equal(writes.length, 0);
  assert.deepEqual(c, before);
  assert.equal("seed" in c.groups[0].features.gradual, false);
  c.groups[0].features.gradual.seed = 0.25;
  const goodResult = await publishApprovedChanges(c, [], {}, write);
  assert.equal(goodResult.success, true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].length, 4);
  assert.equal(
    JSON.parse(writes[0].find((f: any) => f.filePath === "config.json").content)
      .hosting.accessToken,
    ""
  );
  assert.equal(c.hosting.accessToken, "private-token");
});
test("rejected review changes apply to a snapshot and preserve drafts on validation failure", async () => {
  const c = config();
  c.groups[0].features.toggle.name = "Draft name";
  const changes: any[] = [
    {
      type: "CHANGE",
      path: ["groups", 0, "features", "toggle", "name"],
      value: "Draft name",
      oldValue: "Toggle",
    },
  ];
  assert.equal(
    approvedConfig(c, changes, {}).groups[0].features.toggle.name,
    "Toggle"
  );
  assert.equal(c.groups[0].features.toggle.name, "Draft name");
  delete c.groups[0].features.gradual.seed;
  const before = structuredClone(c);
  let writes = 0;
  const result = await publishApprovedChanges(c, changes, {}, async () => {
    writes++;
  });
  assert.equal(result.success, false);
  assert.equal(writes, 0);
  assert.deepEqual(c, before);
});

test("out-of-range group and environment seeds prevent every hosting write", async () => {
  for (const environment of [false, true]) {
    for (const seed of [-0.1, 0, 1.1]) {
      const c = config();
      const feature = environment
        ? c.groups[0].environments.dev.features.gradual
        : c.groups[0].features.gradual;
      feature.seed = seed;
      const before = structuredClone(c);
      let writes = 0;
      const result = await publishApprovedChanges(c, [], {}, async () => {
        writes++;
      });
      assert.equal(result.success, false);
      assert.equal(writes, 0);
      assert.deepEqual(c, before);
    }
  }
});

test("direct-provider credentials are also scrubbed from authoring backups", async () => {
  const c = config();
  c.hosting = {
    provider: "s3",
    providerType: "direct",
    accessKeyId: "key",
    secretAccessKey: "secret",
  };
  let files: any[] = [];
  const result = await publishApprovedChanges(c, [], {}, async (batch) => {
    files = batch;
  });
  assert.equal(result.success, true);
  const hosting = JSON.parse(
    files.find((f) => f.filePath === "config.json").content
  ).hosting;
  assert.equal(hosting.accessKeyId, "");
  assert.equal(hosting.secretAccessKey, "");
  assert.equal(c.hosting.secretAccessKey, "secret");
});

test("review choices cannot redirect publication to an unloaded branch", async () => {
  const c = config();
  c.hosting.targetBranch = "draft";
  let target: string | undefined;
  const changes: any[] = [
    {
      type: "CHANGE",
      path: ["hosting", "targetBranch"],
      value: "draft",
      oldValue: "main",
    },
  ];
  await assert.rejects(
    () =>
      publishApprovedChanges(c, changes, {}, async (_files, branch) => {
        target = branch;
      }),
    /Select and load/
  );
  assert.equal(target, undefined);
  assert.equal(c.hosting.targetBranch, "draft");
});

test("review choices cannot replace the verified Bitbucket workspace", async () => {
  const c = config();
  c.hosting = {
    provider: "bitbucket",
    providerType: "git",
    accessToken: "private",
    repositoryId: "flags",
    owner: "work-b",
    repositoryName: "flags",
    workspaceId: "work-b",
    targetBranch: "main",
  };
  const changes: any[] = [
    {
      type: "CHANGE",
      path: ["hosting", "workspaceId"],
      oldValue: "work-a",
      value: "work-b",
    },
  ];
  let writes = 0;
  await assert.rejects(
    () =>
      publishApprovedChanges(c, changes, {}, async () => {
        writes++;
      }),
    /Select and load/
  );
  assert.equal(writes, 0);
  assert.equal(c.hosting.workspaceId, "work-b");
});
