import test from "node:test";
import assert from "node:assert/strict";
const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});
const state = await import("../src/stores/config-valtio");
const {
  config,
  remoteConfig,
  remoteMetadata,
  remoteDifferences,
  localDifferences,
} = state;
const { Fetcher, GitReadError, gitLocationKey, selectGitRepository } =
  await import("../src/utils/fetcher");
const { startConfigPolling } = await import("../src/utils/config-polling");
const flush = () => new Promise(setImmediate);
function reset() {
  Object.assign(config, {
    modifiedAt: 1000,
    groups: [
      { groupId: "draft", name: "Local draft", features: {}, environments: {} },
    ],
    hosting: {
      provider: "github",
      providerType: "git",
      accessToken: "private",
      installationId: "1",
      repositoryId: "10",
      owner: "owner",
      repositoryName: "repo-a",
      targetBranch: "main",
      branchIsValid: true,
      shouldCreatePullRequest: false,
      branchNamePrefix: "vexilla-",
    },
  });
  state.acceptRemoteConfig(JSON.parse(JSON.stringify(config)));
}
test("a changed repository cannot publish or expose the old baseline before effects run", () => {
  reset();
  config.groups[0].name = "Changed draft";
  assert.equal(state.isRemoteBaselineReady(), true);
  if (config.hosting.provider !== "github") {
    throw new Error();
  }
  config.hosting.repositoryId = "20";
  assert.equal(state.isRemoteBaselineReady(), false);
  assert.deepEqual(localDifferences.result, []);
  assert.deepEqual(remoteDifferences.result, []);
  state.invalidateRemoteMetadata();
  assert.equal(remoteConfig.modifiedAt, 0);
  assert.equal(remoteMetadata.status, "unknown");
});
test("a failed destination read blocks publishing; successful retry unlocks the matching baseline", async () => {
  reset();
  class ControlledFetcher extends Fetcher {
    isConfigReady() {
      return true;
    }
    async getCurrentConfig() {
      throw new GitReadError("must not show private-token", 500);
    }
  }
  const stop = startConfigPolling(new ControlledFetcher())!;
  await flush();
  assert.equal(state.isRemoteBaselineReady(), false);
  assert.equal(remoteMetadata.status, "error");
  assert.match(remoteMetadata.readError, /500/);
  assert.doesNotMatch(remoteMetadata.readError, /private-token/);
  stop();
  class RecoveredFetcher extends Fetcher {
    isConfigReady() {
      return true;
    }
    async getCurrentConfig() {
      return JSON.parse(JSON.stringify(config));
    }
  }
  const retry = startConfigPolling(new RecoveredFetcher())!;
  await flush();
  assert.equal(state.isRemoteBaselineReady(), true);
  assert.equal(remoteMetadata.status, "ready");
  retry();
});
test("absent config leaves local drafts publishable through repeated polling", async () => {
  reset();
  class EmptyFetcher extends Fetcher {
    isConfigReady() {
      return true;
    }
    async getCurrentConfig() {
      return null;
    }
  }
  const stop = startConfigPolling(new EmptyFetcher())!;
  await flush();
  assert.equal(remoteMetadata.status, "absent");
  assert.equal(state.isRemoteBaselineReady(), true);
  assert.equal(remoteConfig.groups.length, 0);
  assert.ok(localDifferences.result.some((diff) => diff.path[0] === "groups"));
  config.groups[0].name = "Later draft";
  state.acceptRemoteConfig(null);
  assert.ok(localDifferences.result.some((diff) => diff.path[0] === "groups"));
  assert.equal(config.groups[0].name, "Later draft");
  assert.deepEqual(remoteDifferences.result, []);
  stop();
});
test("token rotation keeps location identity but not stale request authority", () => {
  reset();
  const location = gitLocationKey(config.hosting);
  if (config.hosting.provider !== "github") {
    throw new Error();
  }
  config.hosting.accessToken = "rotated";
  assert.equal(gitLocationKey(config.hosting), location);
  assert.equal(state.isRemoteBaselineReady(), true);
});
test("metadata migrations preserve branches and empty repositories get an initial branch", () => {
  const hosting: any = {
    provider: "gitlab",
    providerType: "git",
    repositoryId: "10",
    owner: "subgroup",
    repositoryName: "Display Name",
    targetBranch: "release",
    branchIsValid: true,
  };
  selectGitRepository(hosting, {
    id: "10",
    owner: "group/subgroup",
    name: "Display Name",
    path: "repo",
    defaultBranch: "main",
  });
  assert.equal(hosting.targetBranch, "release");
  assert.equal(hosting.repositoryName, "repo");
  selectGitRepository(hosting, {
    id: "20",
    name: "Empty",
    path: "empty",
    defaultBranch: "",
  });
  assert.equal(hosting.targetBranch, "main");
  assert.equal(hosting.branchIsValid, false);
});

test("a changed baseline revokes previous merge approval even with the same timestamp", async () => {
  reset();
  remoteMetadata.remoteMergedAt = Date.now();
  const changed = JSON.parse(JSON.stringify(remoteConfig));
  changed.groups[0].name = "Unreviewed remote edit";
  state.acceptRemoteConfig(changed);
  await flush();
  assert.equal(remoteMetadata.remoteMergedAt, 0);
  assert.ok(remoteDifferences.result.length > 0);
});
