import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { HostingConfigGithub } from "../src/types";

const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});
const { config, remoteConfig, remoteMetadata, acceptRemoteConfig } =
  await import("../src/stores/config-valtio");
const {
  GitHubFetcher,
  canDiscoverGitHubRepositories,
  canReadGitHubConfig,
  githubContextKey,
  hasGitHubAuthentication,
  selectGitHubRepository,
} = await import("../src/components/app/forms/GithubForm.fetchers");
const { startConfigPolling } = await import("../src/utils/config-polling");
const startGitHubConfigPolling = () => startConfigPolling(new GitHubFetcher());
const originalFetch = globalThis.fetch;
const source = JSON.parse(
  readFileSync(
    new URL("../../../contract/authoring.json", import.meta.url),
    "utf8"
  )
);
const flush = () => new Promise((resolve) => setImmediate(resolve));
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const hosting = (): HostingConfigGithub => ({
  provider: "github",
  providerType: "git",
  accessToken: "token-A",
  installationId: "1",
  repositoryId: "10",
  owner: "owner-A",
  repositoryName: "repo-A",
  targetBranch: "main",
  branchIsValid: false,
  branchNamePrefix: "vexilla-",
  shouldCreatePullRequest: false,
});
function reset() {
  config.hosting = hosting();
  config.groups = structuredClone(source.groups);
  acceptRemoteConfig({
    modifiedAt: 1,
    groups: [],
    hosting: { provider: "", providerType: "" },
  });
  remoteMetadata.remoteMergedAt = 0;
}
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("readiness rejects every absent/blank required field without sending requests", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    throw new Error("unexpected network");
  };
  for (const key of [
    "providerType",
    "accessToken",
    "repositoryId",
    "owner",
    "repositoryName",
  ]) {
    for (const value of [undefined, "", "   "]) {
      reset();
      (config.hosting as any)[key] = value;
      const fetcher = new GitHubFetcher();
      await assert.rejects(() => fetcher.fetchBranches());
      await assert.rejects(() => fetcher.getCurrentConfig());
      assert.equal(await fetcher.isBranchValid("main"), false);
    }
  }
  for (const branch of [undefined, "", "   "]) {
    reset();
    config.hosting.targetBranch = branch;
    await assert.rejects(() => new GitHubFetcher().getCurrentConfig());
    assert.equal(
      await new GitHubFetcher().isBranchValid(branch as string),
      false
    );
  }
  assert.equal(requests, 0);
  const partial = {
    provider: "github",
    providerType: "git",
    accessToken: "token",
  } as HostingConfigGithub;
  assert.ok(hasGitHubAuthentication(partial));
  assert.equal(canDiscoverGitHubRepositories(partial), false);
  assert.equal(canReadGitHubConfig(partial), false);
  config.hosting = partial;
  globalThis.fetch = async (url) => {
    requests++;
    return json(
      `${url}`.includes("/repositories")
        ? { total_count: 0, repositories: [] }
        : { total_count: 0, installations: [] }
    );
  };
  await new GitHubFetcher().fetchInstallations();
  await assert.rejects(() => new GitHubFetcher().fetchRepositories("  "));
  await new GitHubFetcher().fetchRepositories("1");
  assert.equal(requests, 2);
});

test("selection changes identity/default branch together; refresh preserves an explicit branch", () => {
  const h = hosting();
  const repo = {
    id: "20",
    owner: "owner-B",
    name: "repo-B",
    defaultBranch: "develop",
  };
  h.branchIsValid = true;
  selectGitHubRepository(h, repo);
  assert.deepEqual(
    [
      h.repositoryId,
      h.owner,
      h.repositoryName,
      h.targetBranch,
      h.branchIsValid,
    ],
    ["20", "owner-B", "repo-B", "develop", false]
  );
  h.targetBranch = "release";
  selectGitHubRepository(h, repo);
  assert.equal(h.targetBranch, "release");
  selectGitHubRepository(h);
  assert.deepEqual(
    [
      h.repositoryId,
      h.owner,
      h.repositoryName,
      h.targetBranch,
      h.branchIsValid,
    ],
    ["", "", "", "", false]
  );
});

test("a multi-step read retains repository and authorization after active selection changes", async () => {
  reset();
  const seen: { url: string; token: string }[] = [];
  const fetched = {
    modifiedAt: 10,
    groups: [],
    hosting: { ...hosting(), accessToken: "" },
  };
  globalThis.fetch = async (url, options) => {
    seen.push({
      url: `${url}`,
      token: (options!.headers as any).Authorization,
    });
    config.hosting = {
      ...hosting(),
      accessToken: "token-B",
      repositoryName: "repo-B",
      owner: "owner-B",
    };
    if (`${url}`.includes("/branches/")) {
      return json({ commit: { sha: "head-A" } });
    }
    if (`${url}`.includes("/git/trees/")) {
      return json({ tree: [{ path: "config.json", sha: "blob-A" }] });
    }
    return json({
      content: Buffer.from(JSON.stringify(fetched)).toString("base64"),
    });
  };
  const result = await new GitHubFetcher().getCurrentConfig();
  assert.equal(result!.modifiedAt, 10);
  assert.equal(seen.length, 3);
  assert.ok(
    seen.every(
      (r) =>
        r.url.includes("/repos/owner-A/repo-A/") && r.token === "Bearer token-A"
    )
  );
});

for (const stage of ["branch", "tree", "blob"]) {
  for (const status of [401, 403, 404, 500]) {
    test(`${stage} HTTP ${status} remains a failure with its status`, async () => {
      reset();
      globalThis.fetch = async (url) => {
        const current = `${url}`.includes("/branches/")
          ? "branch"
          : `${url}`.includes("/trees/")
          ? "tree"
          : "blob";
        return current === stage
          ? json({ message: "failure" }, status)
          : current === "branch"
          ? json({ commit: { sha: "head" } })
          : json({ tree: [{ path: "config.json", sha: "blob" }] });
      };
      await assert.rejects(() => new GitHubFetcher().getCurrentConfig(), {
        status,
      });
      assert.equal(
        (config.hosting as HostingConfigGithub).accessToken,
        "token-A"
      );
    });
  }
}

test("only a complete successful tree proves config.json is absent", async () => {
  reset();
  await flush();
  const before = JSON.stringify(config);
  globalThis.fetch = async (url) =>
    `${url}`.includes("/branches/")
      ? json({ commit: { sha: "head" } })
      : json({ tree: [], truncated: false });
  assert.equal(await new GitHubFetcher().getCurrentConfig(), null);
  assert.equal(JSON.stringify(config), before);
  globalThis.fetch = async (url) =>
    `${url}`.includes("/branches/")
      ? json({ commit: { sha: "head" } })
      : json({ tree: [], truncated: true });
  await assert.rejects(
    () => new GitHubFetcher().getCurrentConfig(),
    /incomplete/
  );
});

for (const content of ["null", "[]", "{}", '{"groups":[]}']) {
  test(`invalid document ${content} is never mistaken for an absent config`, async () => {
    reset();
    globalThis.fetch = async (url) =>
      `${url}`.includes("/branches/")
        ? json({ commit: { sha: "head" } })
        : `${url}`.includes("/trees/")
        ? json({ tree: [{ path: "config.json", sha: "blob" }] })
        : json({ content: Buffer.from(content).toString("base64") });
    await assert.rejects(
      () => new GitHubFetcher().getCurrentConfig(),
      /Invalid GitHub config document/
    );
  });
}

for (const failure of [401, 403, 404, 500, "network"] as const) {
  test(`polling handles current ${failure} without overwriting baseline or local groups`, async () => {
    reset();
    globalThis.fetch = async () => {
      if (failure === "network") {
        throw new Error("offline");
      }
      return json({}, failure);
    };
    const before = JSON.stringify(config.groups);
    const stop = startGitHubConfigPolling()!;
    try {
      await flush();
      assert.equal(
        (config.hosting as HostingConfigGithub).accessToken,
        failure === 401 ? "" : "token-A"
      );
      assert.equal(remoteConfig.modifiedAt, 1);
      assert.equal(JSON.stringify(config.groups), before);
      assert.equal(
        (config.hosting as HostingConfigGithub).repositoryName,
        "repo-A"
      );
    } finally {
      stop();
    }
  });
}

for (const change of [
  "installationId",
  "repositoryId",
  "owner",
  "repositoryName",
  "targetBranch",
  "accessToken",
  "unmount",
] as const) {
  for (const failure of [false, true]) {
    test(`late ${
      failure ? "401" : "success"
    } after ${change} cannot affect active state`, async () => {
      reset();
      let release!: (response: Response) => void;
      globalThis.fetch = () =>
        new Promise((resolve) => {
          release = resolve;
        });
      const stop = startGitHubConfigPolling()!;
      if (change === "unmount") {
        stop();
      } else {
        (config.hosting as any)[change] = "new-value";
      }
      const key = githubContextKey(config.hosting);
      release(failure ? json({}, 401) : json({ commit: { sha: "head" } }));
      // The old sequence can finish, always using its captured context.
      globalThis.fetch = async () => json({ tree: [] });
      await flush();
      assert.equal(remoteConfig.modifiedAt, 1);
      assert.equal(githubContextKey(config.hosting), key);
      stop();
    });
  }
}

test("polls are serialized, refresh every 30 seconds, and stop immediately on readiness loss", async (t) => {
  reset();
  let tick!: () => void;
  let clearCount = 0,
    requests = 0;
  t.mock.method(
    globalThis,
    "setInterval",
    (callback: () => void, delay: number) => {
      assert.equal(delay, 30000);
      tick = callback;
      return 42;
    }
  );
  t.mock.method(globalThis, "clearInterval", () => {
    clearCount++;
  });
  let release!: (value: Response) => void;
  globalThis.fetch = () => {
    requests++;
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  const stop = startGitHubConfigPolling()!;
  assert.equal(requests, 1);
  tick();
  tick();
  assert.equal(requests, 1);
  globalThis.fetch = async () => {
    requests++;
    return json({ tree: [] });
  };
  release(json({ commit: { sha: "head" } }));
  await flush();
  assert.equal(requests, 2);
  globalThis.fetch = async (url) => {
    requests++;
    return `${url}`.includes("/branches/")
      ? json({ commit: { sha: "head" } })
      : json({ tree: [] });
  };
  tick();
  await flush();
  assert.equal(requests, 4);
  (config.hosting as HostingConfigGithub).repositoryId = "";
  tick();
  await flush();
  assert.equal(requests, 4);
  assert.ok(clearCount >= 1);
  stop();
});

for (const endpoint of ["installations", "repositories", "branches"] as const) {
  test(`${endpoint} pagination follows every page with captured authorization`, async () => {
    reset();
    const seen: { url: string; token: string }[] = [];
    globalThis.fetch = async (url, options) => {
      const parsed = new URL(`${url}`);
      seen.push({
        url: `${url}`,
        token: (options!.headers as any).Authorization,
      });
      config.hosting = {
        ...hosting(),
        owner: "owner-B",
        repositoryName: "repo-B",
        accessToken: "token-B",
      };
      assert.equal(parsed.searchParams.get("per_page"), "100");
      const secondPage = parsed.searchParams.get("page") === "2";
      const entries = secondPage
        ? [{ id: 2, name: "second" }]
        : [{ id: 1, name: "first" }];
      const body =
        endpoint === "branches"
          ? entries
          : { total_count: 2, [endpoint]: entries };
      const response = json(body);
      if (!secondPage) {
        parsed.searchParams.set("page", "2");
        response.headers.set("Link", `<${parsed}>; rel="next"`);
      }
      return response;
    };
    const fetcher = new GitHubFetcher();
    const entries =
      endpoint === "branches"
        ? await fetcher.fetchBranches()
        : endpoint === "installations"
        ? (await fetcher.fetchInstallations()).installations
        : (await fetcher.fetchRepositories("1")).repositories;
    assert.equal(entries.length, 2);
    assert.equal(seen.length, 2);
    assert.ok(seen.every((request) => request.token === "Bearer token-A"));
    if (endpoint === "branches") {
      assert.ok(
        seen.every((request) => request.url.includes("/repos/owner-A/repo-A/"))
      );
    }
  });
}

for (const scenario of [
  "unsafe-origin",
  "different-path",
  "repeated-url",
  "repeated-page",
  "missing-page",
  "later-failure",
] as const) {
  test(`incomplete ${scenario} discovery rejects the whole collection`, async () => {
    reset();
    let calls = 0;
    globalThis.fetch = async (url) => {
      calls++;
      if (calls === 2 && scenario === "later-failure") {
        return json({}, 403);
      }
      const response = json({
        total_count: scenario === "missing-page" ? 2 : 3,
        installations: [{ id: scenario === "repeated-page" ? 1 : calls }],
      });
      if (scenario !== "missing-page") {
        const next = new URL(`${url}`);
        if (scenario === "unsafe-origin") {
          next.hostname = "untrusted.example";
        }
        if (scenario === "different-path") {
          next.pathname = "/unrelated";
        }
        if (scenario !== "repeated-url") {
          next.searchParams.set("page", `${calls + 1}`);
        }
        response.headers.set("Link", `<${next}>; rel="next"`);
      }
      return response;
    };
    await assert.rejects(() => new GitHubFetcher().fetchInstallations());
    assert.ok(calls <= 2);
  });
}

for (const failure of [401, 403, 500, "network"] as const) {
  test(`branch validation propagates ${failure} instead of claiming the repository is empty`, async () => {
    reset();
    globalThis.fetch = async () => {
      if (failure === "network") {
        throw new Error("offline");
      }
      return json({}, failure);
    };
    await assert.rejects(
      () => new GitHubFetcher().isBranchValid("main"),
      failure === "network" ? /offline/ : { status: failure }
    );
  });
}
for (const status of [404, 409]) {
  test(`branch validation recognizes absent/empty repository HTTP ${status}`, async () => {
    reset();
    globalThis.fetch = async () => json({}, status);
    assert.equal(await new GitHubFetcher().isBranchValid("main"), false);
  });
}

test("overlapping pages cannot masquerade as a complete repository collection", async () => {
  reset();
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    const response = json({
      total_count: 3,
      repositories: calls === 1 ? [{ id: 1 }, { id: 2 }] : [{ id: 2 }],
    });
    if (calls === 1) {
      response.headers.set("Link", `<${url}&page=2>; rel="next"`);
    }
    return response;
  };
  await assert.rejects(
    () => new GitHubFetcher().fetchRepositories("1"),
    /Repeated/
  );
});

test("a never-ending pagination chain fails at a finite page limit", async () => {
  reset();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    const response = json([{ name: `branch-${calls}` }]);
    response.headers.set(
      "Link",
      `<https://api.github.com/repos/owner-A/repo-A/branches?per_page=100&page=${
        calls + 1
      }>; rel="next"`
    );
    return response;
  };
  await assert.rejects(() => new GitHubFetcher().fetchBranches(), /page limit/);
  assert.equal(calls, 1000);
});
