import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = JSON.parse(
  readFileSync(
    new URL("../../../contract/authoring.json", import.meta.url),
    "utf8"
  )
);
const saved = {
  ...source,
  modifiedAt: 123,
  hosting: { provider: "", providerType: "", token: "saved" },
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

for (const keys of [
  [],
  ["config"],
  ["remoteConfig"],
  ["config", "remoteConfig"],
]) {
  test(`independent initialization and persistence with saved keys: ${
    keys.join(",") || "none"
  }`, async () => {
    const storage = new Map(keys.map((key) => [key, JSON.stringify(saved)]));
    const writes: string[] = [];
    Object.assign(globalThis, {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
          writes.push(key);
        },
      },
    });
    const { config, remoteConfig, remoteMetadata } = await import(
      `../src/stores/config-valtio.ts?case=${keys.join("-")}`
    );
    const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
    assert.notEqual(config, remoteConfig);
    assert.notEqual(config.hosting, remoteConfig.hosting);
    assert.notEqual(config.groups, remoteConfig.groups);
    for (const [key, value] of [
      ["config", config],
      ["remoteConfig", remoteConfig],
    ] as const) {
      assert.deepEqual(
        plain(value),
        keys.includes(key)
          ? saved
          : {
              modifiedAt: 0,
              groups: [],
              hosting: { provider: "", providerType: "" },
            }
      );
    }
    const beforeRemote = plain(remoteConfig);
    const beforeMetadata = plain(remoteMetadata);
    const previousStoredRemote = storage.get("remoteConfig");
    config.groups = plain(source.groups);
    config.groups[0].name = "Local edit";
    (config.hosting as any).token = "local-token";
    await flush();
    assert.deepEqual(plain(remoteConfig), beforeRemote);
    assert.deepEqual(plain(remoteMetadata), beforeMetadata);
    assert.equal(storage.get("remoteConfig"), previousStoredRemote);
    assert.equal(writes.includes("remoteMetadata"), false);
    assert.ok(config.modifiedAt > 123);
    assert.deepEqual(JSON.parse(storage.get("config")!), plain(config));
    const localBefore = plain(config);
    const localStoredBefore = storage.get("config");
    writes.length = 0;
    remoteConfig.groups = plain(source.groups);
    remoteConfig.groups[0].name = "Remote edit";
    (remoteConfig.hosting as any).token = "remote-token";
    await flush();
    assert.deepEqual(plain(config), localBefore);
    assert.equal(storage.get("config"), localStoredBefore);
    assert.deepEqual([...new Set(writes)], ["remoteConfig"]);
    assert.deepEqual(
      JSON.parse(storage.get("remoteConfig")!),
      plain(remoteConfig)
    );
  });
}

test("accepting remote objects and scrubbed credentials preserves local edits and references", async () => {
  const storage = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
  const { config, remoteConfig, acceptRemoteConfig } = await import(
    "../src/stores/config-valtio.ts?accept"
  );
  config.groups = structuredClone(source.groups);
  config.hosting = {
    provider: "github",
    providerType: "git",
    accessToken: "private-token",
  } as any;
  await flush();
  const before = JSON.stringify(config);
  const result = JSON.parse(before);
  result.hosting.accessToken = "";
  result.groups[0].name = "Fetched";
  acceptRemoteConfig(result);
  await flush();
  assert.equal(JSON.stringify(config), before);
  assert.equal((remoteConfig.hosting as any).accessToken, "");
  result.groups[0].name = "Caller changed";
  assert.equal(remoteConfig.groups[0].name, "Fetched");
  acceptRemoteConfig(config);
  config.groups[0].name = "Local later";
  assert.notEqual(remoteConfig.groups[0].name, config.groups[0].name);
  remoteConfig.groups[0].name = "Remote later";
  assert.equal(config.groups[0].name, "Local later");
});
