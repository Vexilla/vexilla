import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { subscribe } from "valtio";
import type { HostingConfigGithub } from "../src/types";

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});
const state = await import("../src/stores/config-valtio");
const { config, remoteMetadata, remoteConfig } = state;
const { GitFetcher, GitReadError } = await import("../src/utils/fetcher");
const { GitHubFetcher } = await import(
  "../src/components/app/forms/GithubForm.fetchers"
);
const { startConfigPolling, initializeGitBranch } = await import(
  "../src/utils/config-polling"
);
const flush = () => new Promise(setImmediate);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });
const hosting = (): HostingConfigGithub => ({
  provider: "github",
  providerType: "git",
  accessToken: "secret-A",
  installationId: "1",
  repositoryId: "10",
  owner: "owner",
  repositoryName: "empty",
  targetBranch: "main",
  branchIsValid: true,
  shouldCreatePullRequest: false,
  branchNamePrefix: "vexilla-",
});
function reset() {
  config.hosting = hosting();
  config.groups = [
    {
      groupId: "draft",
      name: "Unpublished draft",
      features: {},
      environments: {},
    },
  ];
  state.advanceRemoteRead();
  state.invalidateRemoteMetadata();
}
function owner(fetcher: InstanceType<typeof GitFetcher>) {
  let stop = startConfigPolling(fetcher);
  const unsubscribe = subscribe(
    state.configReadRefresh,
    () => {
      stop?.();
      stop = startConfigPolling(fetcher);
    },
    true
  );
  return () => {
    unsubscribe();
    stop?.();
  };
}
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function githubFixture() {
  const requests: string[] = [];
  let initialized = false;
  let writes = 0;
  let write: () => Promise<Response> = async () => {
    initialized = true;
    return json({}, 201);
  };
  let readFailure = false;
  globalThis.fetch = async (url, options) => {
    const path = new URL(`${url}`).pathname;
    requests.push(`${options?.method || "GET"} ${path}`);
    if (options?.method === "PUT") {
      writes++;
      const body = JSON.parse(options.body as string);
      assert.equal(body.branch, "main");
      assert.equal(body.sha, undefined);
      return write();
    }
    if (path.endsWith("/branches")) {
      return readFailure
        ? json({}, 503)
        : json(initialized ? [{ name: "main" }] : []);
    }
    if (path.endsWith("/branches/main")) {
      return initialized
        ? json({ commit: { sha: "head", commit: { tree: { sha: "tree" } } } })
        : json({}, 404);
    }
    if (path.includes("/git/trees/")) {
      return initialized
        ? json({
            tree: [{ path: "README.md", sha: "readme" }],
            truncated: false,
          })
        : json({ message: "Git Repository is empty." }, 409);
    }
    throw new Error(`Unexpected request ${path}`);
  };
  return {
    requests,
    get writes() {
      return writes;
    },
    set initialized(value: boolean) {
      initialized = value;
    },
    set write(value: typeof write) {
      write = value;
    },
    set readFailure(value: boolean) {
      readFailure = value;
    },
  };
}

test("verified empty discovery pauses timers and README initialization immediately establishes an absent baseline", async (t) => {
  reset();
  const api = githubFixture();
  const timers: (() => void)[] = [];
  t.mock.method(
    globalThis,
    "setInterval",
    (callback: () => void, delay: number) => {
      assert.equal(delay, 30000);
      timers.push(callback);
      return timers.length as any;
    }
  );
  t.mock.method(globalThis, "clearInterval", () => {});
  const stop = owner(new GitHubFetcher());
  try {
    await flush();
    assert.equal(remoteMetadata.status, "initialization-required");
    assert.equal(state.isRemoteBaselineReady(), false);
    assert.deepEqual(api.requests, [
      "GET /repos/owner/empty/branches",
      "GET /repos/owner/empty/git/trees/main",
    ]);
    assert.equal(
      timers.length,
      0,
      "empty repositories must not schedule a polling interval"
    );
    assert.equal(api.writes, 0);
    let release!: (response: Response) => void;
    api.write = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const operation = initializeGitBranch(new GitHubFetcher(), "main");
    await flush();
    assert.equal(remoteMetadata.status, "initializing");
    assert.equal(state.isRemoteBaselineReady(), false);
    state.requestRemoteRead();
    await initializeGitBranch(new GitHubFetcher(), "main");
    assert.equal(api.writes, 1);
    assert.equal(
      api.requests.length,
      3,
      "no reads or duplicate writes while pending"
    );
    api.initialized = true;
    release(json({}, 201));
    await operation;
    await flush();
    assert.deepEqual(api.requests.slice(3), [
      "GET /repos/owner/empty/branches",
      "GET /repos/owner/empty/branches/main",
      "GET /repos/owner/empty/git/trees/tree",
    ]);
    assert.equal(remoteMetadata.status, "absent");
    assert.equal(state.isRemoteBaselineReady(), true);
    assert.equal(
      config.hosting.providerType === "git" && config.hosting.branchIsValid,
      true
    );
    assert.equal(remoteConfig.groups.length, 0);
    assert.equal(config.groups[0].name, "Unpublished draft");
    assert.equal(timers.length, 1);
    timers[0]();
    await flush();
    assert.equal(
      api.requests.filter((path) => path.endsWith("/branches")).length,
      2,
      "routine polling reuses preparation"
    );
    assert.equal(
      api.requests.filter((path) => path.endsWith("/branches/main")).length,
      2
    );
    await flush();
    assert.doesNotMatch(
      storage.get("remoteMetadata")!,
      /secret-A|generation|context/
    );
  } finally {
    stop();
  }
});

for (const outcome of [
  "failed-empty",
  "unacknowledged",
  "conflict",
  "validation",
  "read-failure",
] as const) {
  test(`initialization ${outcome} rechecks before enabling publication or another write`, async () => {
    reset();
    const api = githubFixture();
    const stop = owner(new GitHubFetcher());
    try {
      await flush();
      api.write = async () => {
        if (outcome === "failed-empty") {
          return json({}, 500);
        }
        api.initialized = true;
        if (outcome === "read-failure") {
          api.readFailure = true;
          return json({}, 201);
        }
        if (outcome === "unacknowledged") {
          throw new Error("private response body secret-A");
        }
        return json({}, outcome === "conflict" ? 409 : 422);
      };
      const operation = initializeGitBranch(new GitHubFetcher(), "main");
      if (outcome === "read-failure") {
        await operation;
      } else {
        await assert.rejects(operation);
      }
      await flush();
      assert.equal(api.writes, 1);
      assert.equal(
        api.requests.filter((path) => path.endsWith("/branches")).length,
        2
      );
      assert.equal(config.groups[0].name, "Unpublished draft");
      assert.doesNotMatch(
        remoteMetadata.readError +
          state.remoteReadAuthority.initializationError,
        /secret-A|private response/
      );
      if (outcome === "failed-empty") {
        assert.equal(remoteMetadata.status, "initialization-required");
        assert.equal(state.isRemoteBaselineReady(), false);
        assert.match(
          state.remoteReadAuthority.initializationError,
          /not confirmed/
        );
      } else if (outcome === "read-failure") {
        assert.equal(remoteMetadata.status, "error");
        assert.equal(state.isRemoteBaselineReady(), false);
        await initializeGitBranch(new GitHubFetcher(), "main");
        assert.equal(
          api.writes,
          1,
          "a read failure must not offer blind reinitialization"
        );
        api.readFailure = false;
        state.requestRemoteRead();
        await flush();
        assert.equal(remoteMetadata.status, "absent");
      } else {
        assert.equal(remoteMetadata.status, "absent");
        assert.equal(state.isRemoteBaselineReady(), true);
        assert.match(
          state.remoteReadAuthority.initializationError,
          /not confirmed/
        );
      }
    } finally {
      stop();
    }
  });
}

test("Refresh discovers external initialization and a disappearing branch returns to paused discovery", async () => {
  reset();
  const api = githubFixture();
  const stop = owner(new GitHubFetcher());
  try {
    await flush();
    api.initialized = true;
    state.requestRemoteRead();
    await flush();
    assert.equal(remoteMetadata.status, "absent");
    assert.equal(api.writes, 0);
    api.initialized = false;
    // A new owner also proves reload/retry distrusts saved branch validity.
    state.requestRemoteRead();
    await flush();
    assert.equal(remoteMetadata.status, "initialization-required");
    assert.equal(state.isRemoteBaselineReady(), false);
    assert.equal(config.groups.length, 1);
  } finally {
    stop();
  }
});

for (const oldResult of ["empty", "config", "401"] as const) {
  test(`same-context old ${oldResult} cannot undo a newer generation`, async () => {
    reset();
    let release!: (value: any) => void;
    let reject!: (error: unknown) => void;
    class Delayed extends GitFetcher {
      readonly usesReadPreparation = true;
      isConfigReady() {
        return true;
      }
      async prepareRead(): Promise<"ready" | "initialization-required"> {
        return oldResult === "config"
          ? "ready"
          : new Promise((resolve, fail) => {
              release = resolve;
              reject = fail;
            });
      }
      async getCurrentConfig(): Promise<null> {
        return new Promise((resolve, fail) => {
          release = resolve;
          reject = fail;
        });
      }
    }
    const stopOld = startConfigPolling(new Delayed())!;
    await flush();
    const api = githubFixture();
    api.initialized = true;
    state.requestRemoteRead();
    const stopNew = owner(new GitHubFetcher());
    try {
      await flush();
      assert.equal(remoteMetadata.status, "absent");
      if (oldResult === "401") {
        reject(new GitReadError("obsolete", 401));
      } else {
        release(
          oldResult === "empty"
            ? "initialization-required"
            : { modifiedAt: 999, groups: [], hosting: {} }
        );
      }
      await flush();
      assert.equal(remoteMetadata.status, "absent");
      assert.equal(remoteConfig.modifiedAt, 0);
      assert.equal(
        (config.hosting as HostingConfigGithub).accessToken,
        "secret-A"
      );
    } finally {
      stopOld();
      stopNew();
    }
  });
}

for (const field of [
  "repositoryId",
  "targetBranch",
  "installationId",
  "provider",
  "accessToken",
] as const) {
  test(`late preparation 401 after ${field} changes cannot clear current credentials`, async () => {
    reset();
    let reject!: (error: unknown) => void;
    class Delayed extends GitFetcher {
      readonly usesReadPreparation = true;
      isConfigReady() {
        return true;
      }
      async prepareRead(): Promise<"ready"> {
        return new Promise((_resolve, fail) => {
          reject = fail;
        });
      }
    }
    const stop = startConfigPolling(new Delayed())!;
    (config.hosting as any)[field] =
      field === "provider" ? "gitlab" : "new-value";
    const currentToken = (config.hosting as any).accessToken;
    reject(new GitReadError("obsolete", 401));
    await flush();
    assert.equal((config.hosting as any).accessToken, currentToken);
    assert.equal(remoteMetadata.status, "unknown");
    stop();
  });
}

test("a late initialization retains its destination without refreshing the new selection", async () => {
  reset();
  const api = githubFixture();
  const stop = owner(new GitHubFetcher());
  try {
    await flush();
    let release!: (response: Response) => void;
    api.write = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const operation = initializeGitBranch(new GitHubFetcher(), "main");
    const revision = state.configReadRefresh.revision;
    (config.hosting as HostingConfigGithub).repositoryName = "different";
    release(json({}, 201));
    await operation;
    await flush();
    assert.equal(state.configReadRefresh.revision, revision);
    assert.equal(remoteMetadata.status, "unknown");
    assert.equal(api.writes, 1);
    assert.ok(
      api.requests.at(-1)?.includes("/repos/owner/empty/contents/README.md")
    );
  } finally {
    stop();
  }
});

test("returning to a destination with a pending initialization cannot send a second write", async () => {
  reset();
  const api = githubFixture();
  let stop = startConfigPolling(new GitHubFetcher());
  try {
    await flush();
    let release!: (response: Response) => void;
    api.write = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const operation = initializeGitBranch(new GitHubFetcher(), "main");
    (config.hosting as HostingConfigGithub).targetBranch = "release";
    stop?.();
    (config.hosting as HostingConfigGithub).targetBranch = "main";
    const requestCount = api.requests.length;
    stop = startConfigPolling(new GitHubFetcher());
    await flush();
    assert.equal(remoteMetadata.status, "initializing");
    await initializeGitBranch(new GitHubFetcher(), "main");
    assert.equal(api.writes, 1);
    assert.equal(
      api.requests.length,
      requestCount,
      "returning pauses reads until the captured write finishes"
    );
    api.initialized = true;
    release(json({}, 201));
    await operation;
    assert.equal(remoteMetadata.status, "loading");
    stop = startConfigPolling(new GitHubFetcher());
    await flush();
    assert.equal(remoteMetadata.status, "absent");
    assert.equal(api.writes, 1);
  } finally {
    stop?.();
  }
});

test("a branch that disappears during routine polling is rechecked and pauses its interval", async (t) => {
  reset();
  const api = githubFixture();
  api.initialized = true;
  let tick!: () => void;
  let cleared = 0;
  t.mock.method(globalThis, "setInterval", (callback: () => void) => {
    tick = callback;
    return 1 as any;
  });
  t.mock.method(globalThis, "clearInterval", (timer: unknown) => {
    if (timer) {
      cleared++;
    }
  });
  const stop = startConfigPolling(new GitHubFetcher())!;
  try {
    await flush();
    assert.equal(remoteMetadata.status, "absent");
    api.initialized = false;
    tick();
    await flush();
    assert.equal(remoteMetadata.status, "initialization-required");
    assert.equal(state.isRemoteBaselineReady(), false);
    assert.ok(cleared > 0);
    assert.deepEqual(api.requests.slice(-3), [
      "GET /repos/owner/empty/branches/main",
      "GET /repos/owner/empty/branches",
      "GET /repos/owner/empty/git/trees/main",
    ]);
    const count = api.requests.length;
    // Even a queued timer callback cannot restart ordinary reads after pausing.
    tick();
    await flush();
    assert.equal(api.requests.length, count);
  } finally {
    stop();
  }
});

test("verified emptiness discards a saved matching baseline and its merge approval", async () => {
  reset();
  state.acceptRemoteConfig({
    modifiedAt: 100,
    groups: [
      {
        groupId: "saved",
        name: "Saved remote",
        features: {},
        environments: {},
      },
    ],
    hosting: hosting(),
  });
  remoteMetadata.remoteMergedAt = 200;
  githubFixture();
  const stop = startConfigPolling(new GitHubFetcher())!;
  try {
    await flush();
    assert.equal(remoteMetadata.status, "initialization-required");
    assert.equal(remoteMetadata.remoteModifiedAt, 0);
    assert.equal(remoteMetadata.remoteMergedAt, 0);
    assert.equal(remoteConfig.groups.length, 0);
    assert.equal(state.isRemoteBaselineReady(), false);
    assert.equal(config.groups[0].groupId, "draft");
  } finally {
    stop();
  }
});
