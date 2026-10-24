import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import type {
  AppState,
  HostingConfigBitbucket,
  HostingConfigGitLab,
} from "../src/types";
import { selectGitRepository } from "../src/utils/fetcher";
const storage = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
});
const { config, remoteConfig, remoteMetadata, acceptRemoteConfig } =
  await import("../src/stores/config-valtio");
const { GitLabFetcher } = await import(
  "../src/components/app/forms/GitlabForm.fetchers"
);
const { BitbucketFetcher } = await import(
  "../src/components/app/forms/BitbucketForm.fetchers"
);
const { startConfigPolling } = await import("../src/utils/config-polling");
const realFetch = globalThis.fetch;
const flush = () => new Promise((resolve) => setImmediate(resolve));
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
afterEach(() => {
  globalThis.fetch = realFetch;
});

type GitHosting = HostingConfigGitLab | HostingConfigBitbucket;
const cases = [
  { provider: "gitlab" as const, create: () => new GitLabFetcher() },
  { provider: "bitbucket" as const, create: () => new BitbucketFetcher() },
];
for (const { provider, create } of cases) {
  const hosting = (): GitHosting => ({
    provider,
    providerType: "git",
    accessToken: "token-a",
    repositoryId: "repo-a",
    owner: "owner-a",
    repositoryName: "repo-a",
    targetBranch: "main",
    branchIsValid: false,
    shouldCreatePullRequest: false,
    branchNamePrefix: "vexilla-",
    workspaceId: "work-a",
  });
  const local = (): AppState => ({
    modifiedAt: 10,
    groups: [
      {
        groupId: "draft",
        name: "Local draft",
        features: {},
        environments: {},
      } as any,
    ],
    hosting: hosting(),
  });
  const remote = (): AppState => ({
    modifiedAt: 50,
    groups: [
      {
        groupId: "fetched",
        name: "Crème 東京",
        features: {},
        environments: {},
      } as any,
    ],
    hosting: { ...hosting(), accessToken: "" },
  });
  function reset() {
    Object.assign(config, local());
    acceptRemoteConfig({
      modifiedAt: 1,
      groups: [],
      hosting: { provider: "", providerType: "" },
    });
    remoteMetadata.remoteMergedAt = 0;
  }
  function stage(url: string) {
    const path = new URL(url).pathname;
    return path.includes("/repository/files/") || path.endsWith("/config.json")
      ? "file"
      : path.includes("/repository/tree") || path.includes("/src/")
      ? "tree"
      : "branch";
  }
  function success(url: string, withConfig = true) {
    const current = stage(url);
    if (current === "branch") {
      return json(
        provider === "gitlab"
          ? { commit: { id: "head-a" } }
          : { target: { hash: "head-a" } }
      );
    }
    if (current === "tree") {
      const files = withConfig ? [{ path: "config.json" }] : [];
      return json(provider === "gitlab" ? files : { values: files });
    }
    if (!withConfig) {
      return json({}, 404);
    }
    return json(
      provider === "gitlab"
        ? {
            encoding: "base64",
            content: Buffer.from(JSON.stringify(remote())).toString("base64"),
          }
        : remote()
    );
  }

  test(`${provider}: incomplete selection suppresses branch/config requests`, async () => {
    let requests = 0;
    globalThis.fetch = async () => {
      requests++;
      throw new Error("unexpected request");
    };
    const fields = [
      "providerType",
      "accessToken",
      "repositoryId",
      "owner",
      "repositoryName",
      ...(provider === "bitbucket" ? ["workspaceId"] : []),
    ];
    for (const key of fields) {
      for (const value of [undefined, "", "   "]) {
        reset();
        (config.hosting as any)[key] = value;
        const fetcher = create();
        await assert.rejects(() => fetcher.fetchBranches());
        await assert.rejects(() => fetcher.getCurrentConfig());
        assert.equal(await fetcher.isBranchValid("main"), false);
      }
    }
    for (const branch of [undefined, "", "   "]) {
      reset();
      config.hosting.targetBranch = branch;
      await assert.rejects(() => create().getCurrentConfig());
      assert.equal(await create().isBranchValid(branch as string), false);
    }
    assert.equal(requests, 0);
    reset();
    assert.equal(create().isConfigReady(config.hosting), true); // validity is false
    config.hosting = {
      provider,
      providerType: "git",
      accessToken: "token-a",
    } as GitHosting;
    globalThis.fetch = async () => {
      requests++;
      return json(provider === "gitlab" ? [] : { values: [] });
    };
    if (provider === "gitlab") {
      await new GitLabFetcher().fetchRepositories();
    } else {
      await new BitbucketFetcher().fetchWorkspaces();
      await assert.rejects(() => new BitbucketFetcher().fetchRepositories());
      (config.hosting as HostingConfigBitbucket).workspaceId = "work-a";
      await new BitbucketFetcher().fetchRepositories();
    }
    assert.equal(requests, provider === "gitlab" ? 1 : 2);
  });

  test(`${provider}: selection uses new default branch, preserves explicit refresh choice, and clears coherently`, () => {
    const h = hosting();
    const repository = {
      id: "repo-b",
      name: "repo-b",
      owner: "owner-b",
      defaultBranch: "develop",
    };
    h.branchIsValid = true;
    selectGitRepository(h, repository);
    assert.deepEqual(
      [
        h.repositoryId,
        h.owner,
        h.repositoryName,
        h.targetBranch,
        h.branchIsValid,
      ],
      ["repo-b", "owner-b", "repo-b", "develop", false]
    );
    h.targetBranch = "release";
    selectGitRepository(h, repository);
    assert.equal(h.targetBranch, "release");
    selectGitRepository(h);
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

  test(`${provider}: successful reads decode config once without changing local data/credentials`, async () => {
    reset();
    globalThis.fetch = async (url) => success(`${url}`);
    await flush();
    const before = JSON.stringify(config);
    const result = await create().getCurrentConfig();
    assert.deepEqual(result, remote());
    acceptRemoteConfig(result!);
    await flush();
    assert.equal(JSON.stringify(config), before);
    assert.equal(remoteConfig.groups[0].name, "Crème 東京");
    assert.equal((remoteConfig.hosting as GitHosting).accessToken, "");
  });

  test(`${provider}: multi-step read retains token, origin, workspace, repository, branch and commit`, async () => {
    reset();
    (config.hosting as GitHosting).baseUrl = "https://old.example";
    const seen: { url: string; token: string }[] = [];
    globalThis.fetch = async (url, options) => {
      seen.push({
        url: `${url}`,
        token: (options!.headers as any).Authorization,
      });
      Object.assign(config.hosting, {
        accessToken: "token-b",
        baseUrl: "https://new.example",
        repositoryId: "repo-b",
        repositoryName: "repo-b",
        owner: "owner-b",
        targetBranch: "release",
        workspaceId: "work-b",
      });
      return success(`${url}`);
    };
    await create().getCurrentConfig();
    assert.equal(seen.length, 2);
    assert.ok(
      seen.every(
        (request) =>
          request.url.startsWith("https://old.example/") &&
          request.url.includes("repo-a") &&
          request.token === "Bearer token-a"
      )
    );
    assert.ok(seen[0].url.endsWith("/branches/main"));
    assert.ok(seen.slice(1).every((request) => request.url.includes("head-a")));
    if (provider === "bitbucket") {
      assert.ok(seen.every((request) => request.url.includes("/work-a/")));
    }
  });

  for (const failedStage of ["branch", "file"]) {
    for (const status of [401, 403, 404, 500]) {
      test(`${provider}: ${failedStage} HTTP ${status} stays a failure with status`, async () => {
        reset();
        globalThis.fetch = async (url) =>
          stage(`${url}`) === failedStage
            ? json({}, status)
            : success(`${url}`);
        if (failedStage === "file" && status === 404) {
          assert.equal(await create().getCurrentConfig(), null);
        } else {
          await assert.rejects(() => create().getCurrentConfig(), { status });
        }
        assert.equal(remoteConfig.modifiedAt, 1);
        assert.equal((config.hosting as GitHosting).accessToken, "token-a");
      });
    }
  }

  test(`${provider}: only verified file absence returns null without copying drafts into the baseline`, async () => {
    reset();
    globalThis.fetch = async (url) => {
      config.groups[0].name = "Later draft";
      return success(`${url}`, false);
    };
    assert.equal(await create().getCurrentConfig(), null);
    assert.equal(remoteConfig.modifiedAt, 1);
    assert.equal(config.groups[0].name, "Later draft");
  });

  test(`${provider}: config lookup uses the verified commit without enumerating a large root directory`, async () => {
    reset();
    const seen: string[] = [];
    globalThis.fetch = async (url) => {
      seen.push(`${url}`);
      assert.notEqual(stage(`${url}`), "tree");
      return success(`${url}`);
    };
    const result = await create().getCurrentConfig();
    assert.equal(result!.modifiedAt, 50);
    assert.equal(seen.length, 2);
    assert.ok(seen[1].includes("head-a"));
  });

  test(`${provider}: validation needs only one tree entry even when more pages exist`, async () => {
    reset();
    const seen: string[] = [];
    globalThis.fetch = async (url) => {
      seen.push(`${url}`);
      if (stage(`${url}`) !== "tree") {
        return success(`${url}`);
      }
      const parsed = new URL(`${url}`);
      assert.equal(
        parsed.searchParams.get(provider === "gitlab" ? "per_page" : "pagelen"),
        "1"
      );
      return json(
        provider === "gitlab"
          ? [{ path: "README.md" }]
          : {
              values: [{ path: "README.md" }],
              next: `${parsed.origin}${parsed.pathname}?page=2`,
            }
      );
    };
    assert.equal(await create().isBranchValid("main"), true);
    assert.equal(seen.length, provider === "gitlab" ? 1 : 2);
  });

  for (const failure of [401, 403, 404, 500, "network", "parse"] as const) {
    test(`${provider}: polling ${failure} preserves baseline/local edits; only current 401 clears token`, async () => {
      reset();
      const before = JSON.stringify(config.groups);
      globalThis.fetch = async (url) => {
        if (failure === "network") {
          throw new Error("offline");
        }
        if (failure === "parse") {
          return stage(`${url}`) === "file"
            ? new Response("invalid JSON")
            : success(`${url}`);
        }
        return json({}, failure);
      };
      const stop = startConfigPolling(create())!;
      try {
        await flush();
        assert.equal(
          (config.hosting as GitHosting).accessToken,
          failure === 401 ? "" : "token-a"
        );
        assert.equal(remoteConfig.modifiedAt, 1);
        assert.equal(JSON.stringify(config.groups), before);
        assert.equal((config.hosting as GitHosting).repositoryId, "repo-a");
      } finally {
        stop();
      }
    });
  }

  for (const change of [
    "repositoryId",
    "targetBranch",
    "accessToken",
    "baseUrl",
    ...(provider === "bitbucket" ? ["workspaceId"] : []),
    "unmount",
  ]) {
    for (const fail of [false, true]) {
      test(`${provider}: late ${
        fail ? "401" : "success"
      } after ${change} is ignored`, async () => {
        reset();
        let release!: (response: Response) => void;
        globalThis.fetch = () =>
          new Promise((resolve) => {
            release = resolve;
          });
        const fetcher = create();
        const stop = startConfigPolling(fetcher)!;
        if (change === "unmount") {
          stop();
        } else {
          (config.hosting as any)[change] = "new-value";
        }
        const key = fetcher.getReadContextKey(config.hosting);
        release(
          fail
            ? json({}, 401)
            : success(
                provider === "gitlab"
                  ? "https://gitlab.com/branches/main"
                  : "https://api.bitbucket.org/branches/main"
              )
        );
        globalThis.fetch = async (url) => success(`${url}`);
        await flush();
        assert.equal(remoteConfig.modifiedAt, 1);
        assert.equal(fetcher.getReadContextKey(config.hosting), key);
        stop();
      });
    }
  }

  test(`${provider}: validation reads the requested branch and distinguishes absence from read failures`, async () => {
    reset();
    const requests: string[] = [];
    globalThis.fetch = async (url) => {
      requests.push(`${url}`);
      return success(`${url}`);
    };
    assert.equal(await create().isBranchValid("release/next"), true);
    assert.ok(requests[0].includes("release%2Fnext"));
    globalThis.fetch = async () => json({}, 401);
    await assert.rejects(() => create().isBranchValid("main"), { status: 401 });
    globalThis.fetch = async () => json({}, 403);
    await assert.rejects(() => create().isBranchValid("main"), { status: 403 });
    globalThis.fetch = async () => json({}, 404);
    assert.equal(await create().isBranchValid("main"), false);
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    await assert.rejects(() => create().isBranchValid("main"), /offline/);
    assert.equal((config.hosting as GitHosting).accessToken, "token-a");
  });
}

for (const provider of ["gitlab", "bitbucket"] as const) {
  const resetDiscovery = () => {
    config.hosting = {
      provider,
      providerType: "git",
      accessToken: "token-a",
      baseUrl: "https://old.example",
      repositoryId: "repo-a",
      repositoryName: "repo-a",
      owner: "owner-a",
      workspaceId: "work-a",
      targetBranch: "main",
      branchIsValid: true,
      shouldCreatePullRequest: false,
      branchNamePrefix: "vexilla-",
    } as GitHosting;
  };
  const methods =
    provider === "gitlab"
      ? (["fetchRepositories", "fetchBranches"] as const)
      : (["fetchRepositories", "fetchBranches", "fetchWorkspaces"] as const);
  for (const method of methods) {
    const discover = () => {
      const fetcher =
        provider === "gitlab" ? new GitLabFetcher() : new BitbucketFetcher();
      return (fetcher as any)[method]();
    };
    test(`${provider}: ${method} reads all pages with the captured token/origin/repository`, async () => {
      resetDiscovery();
      const seen: string[] = [];
      globalThis.fetch = async (raw, options) => {
        const url = new URL(`${raw}`);
        seen.push(url.href);
        assert.equal(url.origin, "https://old.example");
        assert.equal((options!.headers as any).Authorization, "Bearer token-a");
        Object.assign(config.hosting, {
          accessToken: "token-b",
          baseUrl: "https://new.example",
          repositoryId: "repo-b",
          workspaceId: "work-b",
        });
        const page = Number(url.searchParams.get("page") || 1);
        const entries = [{ id: page, name: `branch-${page}` }];
        return provider === "gitlab"
          ? new Response(JSON.stringify(entries), {
              headers: { "X-Next-Page": page === 1 ? "2" : "" },
            })
          : json({
              values: entries,
              ...(page === 1
                ? { next: `${url.origin}${url.pathname}?pagelen=100&page=2` }
                : {}),
            });
      };
      const result = await discover();
      assert.equal((Array.isArray(result) ? result : result.values).length, 2);
      assert.equal(seen.length, 2);
      assert.ok(
        seen.every((url) => !url.includes("repo-b") && !url.includes("work-b"))
      );
    });

    test(`${provider}: ${method} rejects repeated pages instead of returning a partial list`, async () => {
      resetDiscovery();
      let requests = 0;
      globalThis.fetch = async (raw) => {
        requests++;
        const url = new URL(`${raw}`);
        const next = Number(url.searchParams.get("page") || 1) + 1;
        return provider === "gitlab"
          ? new Response(JSON.stringify([{ id: 1 }]), {
              headers: { "X-Next-Page": `${next}` },
            })
          : json({
              values: [{ id: 1 }],
              next: `${url.origin}${url.pathname}?page=${next}`,
            });
      };
      await assert.rejects(discover, /Repeated .* pagination page/);
      assert.equal(requests, 2);
    });

    test(`${provider}: ${method} rejects a failed later page with its status`, async () => {
      resetDiscovery();
      let requests = 0;
      globalThis.fetch = async (raw) => {
        if (++requests === 2) {
          return json({}, 500);
        }
        const url = new URL(`${raw}`);
        return provider === "gitlab"
          ? new Response(JSON.stringify([{ id: 1 }]), {
              headers: { "X-Next-Page": "2" },
            })
          : json({
              values: [{ id: 1 }],
              next: `${url.origin}${url.pathname}?page=2`,
            });
      };
      await assert.rejects(discover, { status: 500 });
    });
  }

  test(`${provider}: discovery enforces a finite page limit without returning partial data`, async () => {
    resetDiscovery();
    let requests = 0;
    globalThis.fetch = async (raw) => {
      requests++;
      const url = new URL(`${raw}`);
      const page = Number(url.searchParams.get("page") || 1);
      return provider === "gitlab"
        ? new Response(JSON.stringify([{ id: page }]), {
            headers: { "X-Next-Page": `${page + 1}` },
          })
        : json({
            values: [{ id: page }],
            next: `${url.origin}${url.pathname}?page=${page + 1}`,
          });
    };
    await assert.rejects(
      () =>
        provider === "gitlab"
          ? new GitLabFetcher().fetchRepositories()
          : new BitbucketFetcher().fetchRepositories(),
      /pagination limit exceeded/
    );
    assert.equal(requests, 1000);
  });
}

test("Bitbucket discovery rejects cross-origin and different-repository pagination links before sending credentials", async () => {
  config.hosting = {
    provider: "bitbucket",
    providerType: "git",
    accessToken: "token",
    workspaceId: "work",
  } as HostingConfigBitbucket;
  for (const next of [
    "https://evil.example/repositories/work?page=2",
    "https://api.bitbucket.org/2.0/repositories/other?page=2",
  ]) {
    let requests = 0;
    globalThis.fetch = async () => {
      requests++;
      return json({ values: [{ id: 1 }], next });
    };
    await assert.rejects(
      () => new BitbucketFetcher().fetchRepositories(),
      /Invalid Bitbucket pagination link/
    );
    assert.equal(requests, 1);
  }
});

for (const provider of ["gitlab", "bitbucket"] as const) {
  for (const document of [
    null,
    [],
    {},
    { groups: {}, hosting: {}, modifiedAt: 1 },
    { groups: [], hosting: null, modifiedAt: 1 },
    { groups: [], hosting: [], modifiedAt: 1 },
    { groups: [], hosting: {}, modifiedAt: "1" },
  ]) {
    test(`${provider}: rejects malformed config document ${JSON.stringify(
      document
    )}`, async () => {
      config.hosting = {
        provider,
        providerType: "git",
        accessToken: "token",
        repositoryId: "repo",
        repositoryName: "repo",
        owner: "owner",
        workspaceId: "work",
        targetBranch: "main",
      } as GitHosting;
      const fetcher =
        provider === "gitlab" ? new GitLabFetcher() : new BitbucketFetcher();
      globalThis.fetch = async (raw) => {
        const url = `${raw}`;
        if (url.includes("/branches/")) {
          return json(
            provider === "gitlab"
              ? { commit: { id: "head" } }
              : { target: { hash: "head" } }
          );
        }
        return json(
          provider === "gitlab"
            ? {
                encoding: "base64",
                content: Buffer.from(JSON.stringify(document)).toString(
                  "base64"
                ),
              }
            : document
        );
      };
      await assert.rejects(
        () => fetcher.getCurrentConfig(),
        /Invalid .* config document/
      );
    });
  }
}
