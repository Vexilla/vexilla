import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import type { HostingConfigGithub } from "../src/types";

Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
});
const { config } = await import("../src/stores/config-valtio");
const { GitHubFetcher } = await import(
  "../src/components/app/forms/GithubForm.fetchers"
);
const { README_CONTENTS } = await import("../src/utils/repo-init");
const originalFetch = globalThis.fetch;
const flush = () => new Promise((resolve) => setImmediate(resolve));
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
const hosting = (pullRequest = false): HostingConfigGithub => ({
  provider: "github",
  providerType: "git",
  accessToken: "token-A",
  installationId: "1",
  repositoryId: "10",
  owner: "owner-A",
  repositoryName: "repo-A",
  targetBranch: "main",
  branchIsValid: true,
  branchNamePrefix: "vexilla-A-",
  shouldCreatePullRequest: pullRequest,
});
const responseFor = (url: string) => {
  if (url.includes("/branches/")) {
    return json({
      commit: { sha: "parent-A", commit: { tree: { sha: "base-tree-A" } } },
    });
  }
  if (url.endsWith("/git/trees")) {
    return json({ sha: "tree-A" });
  }
  if (url.endsWith("/git/commits")) {
    return json({ sha: "commit-A" });
  }
  return json({});
};
afterEach(() => {
  globalThis.fetch = originalFetch;
});

for (const pullRequest of [false, true]) {
  test(`${
    pullRequest ? "PR" : "direct"
  } publication captures the repository, files, token, mode, and branch prefix and awaits completion`, async () => {
    config.hosting = hosting(pullRequest);
    const requests: {
      url: string;
      token: string;
      body: any;
      method: string;
    }[] = [];
    let release!: (response: Response) => void;
    const terminal = pullRequest ? "/pulls" : "/git/refs/heads/release%2F2026";
    globalThis.fetch = async (url, options) => {
      const address = `${url}`;
      requests.push({
        url: address,
        token: (options!.headers as any).Authorization,
        body: options?.body ? JSON.parse(options.body as string) : undefined,
        method: options?.method || "GET",
      });
      config.hosting = {
        ...hosting(!pullRequest),
        owner: "owner-B",
        repositoryName: "repo-B",
        accessToken: "token-B",
        branchNamePrefix: "vexilla-B-",
      };
      if (address.endsWith(terminal)) {
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return responseFor(address);
    };
    const files = [{ filePath: "config.json", content: "reviewed content" }];
    let resolved = false;
    const publication = new GitHubFetcher()
      .publish("release/2026", files)
      .then(() => {
        resolved = true;
      });
    files[0].content = "later draft";
    await flush();
    assert.equal(resolved, false);
    assert.equal(typeof release, "function");
    release(json({}));
    await publication;
    assert.equal(resolved, true);
    assert.ok(
      requests.every(
        (request) =>
          request.url.includes("/repos/owner-A/repo-A/") &&
          request.token === "Bearer token-A"
      )
    );
    assert.equal(requests[0].url.endsWith("/branches/release%2F2026"), true);
    const tree = requests.find((request) =>
      request.url.endsWith("/git/trees")
    )!;
    assert.equal(tree.body.tree[0].content, "reviewed content");
    assert.equal(tree.body.base_tree, "base-tree-A");
    if (pullRequest) {
      const reference = requests.find((request) =>
        request.url.endsWith("/git/refs")
      )!;
      assert.match(reference.body.ref, /^refs\/heads\/vexilla-A-/);
      const pr = requests.at(-1)!;
      assert.equal(pr.body.base, "release/2026");
      assert.equal(`refs/heads/${pr.body.head}`, reference.body.ref);
    } else {
      assert.equal(requests.at(-1)!.method, "PATCH");
      assert.equal(requests.at(-1)!.body.sha, "commit-A");
    }
  });
}

for (const stage of [
  "branch",
  "tree",
  "commit",
  "reference",
  "pull-request",
] as const) {
  test(`a ${stage} 404 rejects publication without claiming success`, async () => {
    const pullRequest = stage === "pull-request";
    config.hosting = hosting(pullRequest);
    let failed = false;
    globalThis.fetch = async (url) => {
      assert.equal(
        failed,
        false,
        "publication continued after a failed API request"
      );
      const address = `${url}`;
      const current = address.includes("/branches/")
        ? "branch"
        : address.endsWith("/git/trees")
        ? "tree"
        : address.endsWith("/git/commits")
        ? "commit"
        : address.endsWith("/pulls")
        ? "pull-request"
        : "reference";
      if (current === stage) {
        failed = true;
        return json({ message: "not found" }, 404);
      }
      return responseFor(address);
    };
    await assert.rejects(() => new GitHubFetcher().publish("main", []), {
      status: 404,
    });
    assert.equal(failed, true);
  });
}

for (const status of [401, 403, 409, 422, 500, "network"] as const) {
  test(`terminal write ${status} reaches the publication caller`, async () => {
    config.hosting = hosting();
    globalThis.fetch = async (url) => {
      if (`${url}`.includes("/git/refs/heads/")) {
        if (status === "network") {
          throw new Error("offline");
        }
        return json({ message: "failed" }, status);
      }
      return responseFor(`${url}`);
    };
    await assert.rejects(
      () => new GitHubFetcher().publish("main", []),
      status === "network" ? /offline/ : { status }
    );
  });
}

test("empty GitHub repositories initialize the requested branch through the contents API", async () => {
  config.hosting = hosting();
  let release!: (response: Response) => void;
  let request: { url: string; options: RequestInit } | undefined;
  globalThis.fetch = async (url, options) => {
    request = { url: `${url}`, options: options! };
    config.hosting = { ...hosting(), owner: "owner-B", accessToken: "token-B" };
    return new Promise((resolve) => {
      release = resolve;
    });
  };
  let resolved = false;
  const initialization = new GitHubFetcher()
    .initializeBranch("release/2026")
    .then(() => {
      resolved = true;
    });
  await flush();
  assert.equal(resolved, false);
  assert.equal(
    request!.url,
    "https://api.github.com/repos/owner-A/repo-A/contents/README.md"
  );
  assert.equal(request!.options.method, "PUT");
  assert.equal(
    (request!.options.headers as any).Authorization,
    "Bearer token-A"
  );
  const body = JSON.parse(request!.options.body as string);
  assert.equal(body.branch, "release/2026");
  assert.equal(
    Buffer.from(body.content, "base64").toString("utf8"),
    README_CONTENTS
  );
  assert.equal(
    body.sha,
    undefined,
    "initialization must not overwrite an existing README"
  );
  release(json({}, 201));
  await initialization;
  assert.equal(resolved, true);
});

test("initialization propagates write failure", async () => {
  config.hosting = hosting();
  globalThis.fetch = async () => json({ message: "not found" }, 404);
  await assert.rejects(() => new GitHubFetcher().initializeBranch("main"), {
    status: 404,
  });
});

async function readBaseline(
  fetcher: InstanceType<typeof GitHubFetcher>,
  absent = false,
  head = "parent-A",
  changeContext = false
) {
  globalThis.fetch = async (url) => {
    if (`${url}`.includes("/branches/")) {
      return json({
        commit: { sha: head, commit: { tree: { sha: "base-tree-A" } } },
      });
    }
    if (`${url}`.includes("/git/trees/")) {
      if (changeContext) {
        config.hosting = { ...hosting(), accessToken: "token-B" };
      }
      return json({
        tree: absent ? [] : [{ path: "config.json", sha: "blob-A" }],
        truncated: false,
      });
    }
    return json({
      content: Buffer.from(
        JSON.stringify({ modifiedAt: 1, groups: [], hosting: hosting() })
      ).toString("base64"),
    });
  };
  return fetcher.getCurrentConfig();
}

for (const absent of [false, true]) {
  for (const changedHead of [false, true]) {
    test(`${absent ? "absent" : "existing"} baseline ${
      changedHead
        ? "rejects an intervening commit before every write"
        : "allows publication when the reviewed commit is unchanged"
    }`, async () => {
      config.hosting = hosting();
      const fetcher = new GitHubFetcher();
      await readBaseline(fetcher, absent);
      let writes = 0;
      globalThis.fetch = async (url, options) => {
        if (options?.method) {
          writes++;
        }
        if (`${url}`.includes("/branches/")) {
          return json({
            commit: {
              sha: changedHead ? "remote-commit-B" : "parent-A",
              commit: { tree: { sha: "base-tree-A" } },
            },
          });
        }
        return responseFor(`${url}`);
      };
      if (changedHead) {
        await assert.rejects(() => fetcher.publish("main", []), {
          status: 409,
        });
        assert.equal(writes, 0);
      } else {
        await fetcher.publish("main", []);
        assert.equal(writes, 3);
      }
    });
  }
}

test("a stale context read cannot replace the reviewed commit authority", async () => {
  config.hosting = hosting();
  const fetcher = new GitHubFetcher();
  await readBaseline(fetcher);
  await readBaseline(fetcher, false, "stale-commit-B", true);
  config.hosting = hosting();
  let writes = 0;
  globalThis.fetch = async (url, options) => {
    if (options?.method) {
      writes++;
    }
    return responseFor(`${url}`);
  };
  await fetcher.publish("main", []);
  assert.equal(writes, 3);
});

test("publication retains its expected commit if a newer read finishes while it is pending", async () => {
  config.hosting = hosting();
  const fetcher = new GitHubFetcher();
  await readBaseline(fetcher);
  let release!: (response: Response) => void;
  globalThis.fetch = async () =>
    new Promise((resolve) => {
      release = resolve;
    });
  const publication = fetcher.publish("main", []);
  const rejection = assert.rejects(() => publication, { status: 409 });
  await readBaseline(fetcher, false, "newer-commit-B");
  release(
    json({
      commit: {
        sha: "newer-commit-B",
        commit: { tree: { sha: "newer-tree-B" } },
      },
    })
  );
  await rejection;
});
