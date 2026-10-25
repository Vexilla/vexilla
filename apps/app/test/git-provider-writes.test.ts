import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import type { HostingConfigBitbucket, HostingConfigGitLab } from "../src/types";

Object.assign(globalThis, {
  localStorage: { getItem: () => null, setItem: () => {} },
});
const { config } = await import("../src/stores/config-valtio");
const { GitLabFetcher } = await import(
  "../src/components/app/forms/GitlabForm.fetchers"
);
const { BitbucketFetcher } = await import(
  "../src/components/app/forms/BitbucketForm.fetchers"
);
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const flush = () => new Promise((resolve) => setImmediate(resolve));
type Provider = "gitlab" | "bitbucket";
type GitHosting = HostingConfigGitLab | HostingConfigBitbucket;
type SeenRequest = { url: URL; options: RequestInit };
const hosting = (
  provider: Provider,
  pullRequest = false
): HostingConfigGitLab | HostingConfigBitbucket => ({
  provider,
  providerType: "git",
  accessToken: "token-a",
  repositoryId: "repo-a",
  repositoryName: "repo-a",
  owner: "owner-a",
  workspaceId: "work-a",
  targetBranch: "main",
  branchIsValid: true,
  shouldCreatePullRequest: pullRequest,
  branchNamePrefix: "original-",
  baseUrl: "https://old.example",
});
const stage = (request: SeenRequest) => {
  if (request.options.method === "POST") {
    return /\/(?:merge_requests|pullrequests)$/.test(request.url.pathname)
      ? "pr"
      : "commit";
  }
  return request.url.pathname.includes("/repository/files/")
    ? "file"
    : "branch";
};
const success = (provider: Provider, request: SeenRequest) => {
  switch (stage(request)) {
    case "branch":
      return json(
        provider === "gitlab"
          ? { commit: { id: "captured-head" } }
          : { target: { hash: "captured-head" } }
      );
    case "file":
      return request.url.pathname.endsWith("/existing.json")
        ? json({ last_commit_id: "last-file-commit" })
        : json({}, 404);
    case "commit":
      return json({ id: "new-commit", hash: "new-commit" }, 201);
    default:
      return json({ id: 123 }, 201);
  }
};

for (const provider of ["gitlab", "bitbucket"] as const) {
  const create = () =>
    provider === "gitlab" ? new GitLabFetcher() : new BitbucketFetcher();
  for (const pullRequest of [false, true]) {
    test(`${provider}: ${
      pullRequest ? "PR" : "direct"
    } publication retains the initial hosting, files and explicit branch through every request`, async () => {
      config.hosting = hosting(provider, pullRequest);
      const files = [
        { filePath: "existing.json", content: "Original crème 東京" },
        { filePath: "new.json", content: "New data" },
      ];
      const seen: SeenRequest[] = [];
      globalThis.fetch = async (raw, options) => {
        const request = { url: new URL(`${raw}`), options: options! };
        seen.push(request);
        // Simulate switching account/provider/repository while the first request is in flight.
        config.hosting = { provider: "", providerType: "" };
        files[0].content = "Changed after publication began";
        return success(provider, request);
      };
      await create().publish("release/next", files);
      assert.ok(
        seen.every(
          (request) =>
            request.url.origin === "https://old.example" &&
            (request.options.headers as any).Authorization === "Bearer token-a"
        )
      );
      assert.ok(
        seen.every((request) => request.url.pathname.includes("repo-a"))
      );
      assert.ok(seen[0].url.pathname.endsWith("/branches/release%2Fnext"));
      const commit = seen.find((request) => stage(request) === "commit")!;
      const pr = seen.find((request) => stage(request) === "pr");
      if (provider === "gitlab") {
        const body = JSON.parse(commit.options.body as string);
        assert.deepEqual(body.actions, [
          {
            action: "update",
            file_path: "existing.json",
            content: "Original crème 東京",
            encoding: "text",
            last_commit_id: "last-file-commit",
          },
          {
            action: "create",
            file_path: "new.json",
            content: "New data",
            encoding: "text",
          },
        ]);
        assert.ok(
          seen
            .filter((request) => stage(request) === "file")
            .every(
              (request) =>
                request.url.searchParams.get("ref") === "captured-head"
            )
        );
        if (pullRequest) {
          assert.equal(body.start_sha, "captured-head");
          assert.ok(body.branch.startsWith("original-"));
          const pull = JSON.parse(pr!.options.body as string);
          assert.equal(pull.target_branch, "release/next");
          assert.equal(pull.source_branch, body.branch);
        } else {
          assert.equal(body.branch, "release/next");
        }
      } else {
        const form = commit.options.body as FormData;
        assert.equal(form.get("parents"), "captured-head");
        assert.equal(form.has("files"), false);
        assert.equal(
          await (form.get("/existing.json") as Blob).text(),
          "Original crème 東京"
        );
        assert.equal(await (form.get("/new.json") as Blob).text(), "New data");
        assert.equal(
          (commit.options.headers as any)["Content-Type"],
          undefined
        );
        if (pullRequest) {
          assert.ok((form.get("branch") as string).startsWith("original-"));
          assert.ok(
            pr!.url.pathname.endsWith(
              "/repositories/work-a/repo-a/pullrequests"
            )
          );
          const pull = JSON.parse(pr!.options.body as string);
          assert.deepEqual(pull.destination, {
            branch: { name: "release/next" },
          });
          assert.deepEqual(pull.source, {
            branch: { name: form.get("branch") },
          });
          assert.equal(typeof pull.description, "string");
          assert.equal(
            (pr!.options.headers as any)["Content-Type"],
            "application/json"
          );
        } else {
          assert.equal(form.get("branch"), "release/next");
        }
      }
      assert.equal(!!pr, pullRequest);
    });

    test(`${provider}: ${
      pullRequest ? "PR" : "direct"
    } publication waits for the final write response`, async () => {
      config.hosting = hosting(provider, pullRequest);
      let release!: (value: Response) => void;
      let completed = false;
      globalThis.fetch = async (raw, options) => {
        const request = { url: new URL(`${raw}`), options: options! };
        if (stage(request) === (pullRequest ? "pr" : "commit")) {
          return new Promise((resolve) => {
            release = resolve;
          });
        }
        return success(provider, request);
      };
      const publishing = create()
        .publish("main", [{ filePath: "existing.json", content: "data" }])
        .then(() => {
          completed = true;
        });
      await flush();
      assert.equal(typeof release, "function");
      assert.equal(completed, false);
      release(json({ id: 1 }, 201));
      await publishing;
      assert.equal(completed, true);
    });
  }

  for (const failedStage of [
    "branch",
    ...(provider === "gitlab" ? ["file"] : []),
    "commit",
    "pr",
  ]) {
    for (const status of [401, 403, 404, 500]) {
      if (failedStage === "file" && status === 404) {
        continue;
      } // New files use create actions.
      test(`${provider}: ${failedStage} HTTP ${status} rejects publication and stops later writes`, async () => {
        config.hosting = hosting(provider, true);
        const seen: SeenRequest[] = [];
        globalThis.fetch = async (raw, options) => {
          const request = { url: new URL(`${raw}`), options: options! };
          seen.push(request);
          return stage(request) === failedStage
            ? json({}, status)
            : success(provider, request);
        };
        await assert.rejects(
          () =>
            create().publish("main", [
              { filePath: "existing.json", content: "data" },
            ]),
          { status }
        );
        assert.equal(stage(seen.at(-1)!), failedStage);
        if (failedStage === "branch" || failedStage === "file") {
          assert.equal(
            seen.some((request) => stage(request) === "commit"),
            false
          );
        }
        if (failedStage !== "pr") {
          assert.equal(
            seen.some((request) => stage(request) === "pr"),
            false
          );
        }
      });
    }
  }

  test(`${provider}: network write failure rejects publication`, async () => {
    config.hosting = hosting(provider);
    globalThis.fetch = async (raw, options) => {
      const request = { url: new URL(`${raw}`), options: options! };
      if (stage(request) === "commit") {
        throw new Error("offline during write");
      }
      return success(provider, request);
    };
    await assert.rejects(
      () => create().publish("main", []),
      /offline during write/
    );
  });

  test(`${provider}: initialization creates the requested branch with captured credentials and repository`, async () => {
    config.hosting = hosting(provider);
    const seen: SeenRequest[] = [];
    globalThis.fetch = async (raw, options) => {
      const request = { url: new URL(`${raw}`), options: options! };
      seen.push(request);
      config.hosting = { provider: "", providerType: "" };
      return request.options.method === "POST"
        ? json({ id: "first-commit" }, 201)
        : json({}, 404);
    };
    await create().initializeBranch("custom/first");
    assert.ok(
      seen.every(
        (request) =>
          request.url.origin === "https://old.example" &&
          (request.options.headers as any).Authorization === "Bearer token-a" &&
          request.url.pathname.includes("repo-a")
      )
    );
    const commit = seen.at(-1)!;
    if (provider === "gitlab") {
      const body = JSON.parse(commit.options.body as string);
      assert.equal(body.branch, "custom/first");
      assert.equal(body.actions[0].file_path, "README.md");
      assert.equal(body.actions[0].action, "create");
    } else {
      const form = commit.options.body as FormData;
      assert.equal(form.get("branch"), "custom/first");
      assert.equal(form.has("parents"), false);
      assert.equal(form.has("files"), false);
      assert.match(await (form.get("/README.md") as Blob).text(), /Vexilla/i);
    }
  });

  test(`${provider}: initialization rejects failed writes, including HTTP 404`, async () => {
    for (const status of [401, 403, 404, 500]) {
      config.hosting = hosting(provider);
      globalThis.fetch = async (_raw, options) =>
        json({}, options?.method === "POST" ? status : 404);
      await assert.rejects(() => create().initializeBranch("new"), { status });
    }
  });
}

for (const provider of ["gitlab", "bitbucket"] as const) {
  const create = () =>
    provider === "gitlab" ? new GitLabFetcher() : new BitbucketFetcher();
  const readDocument = (document: unknown) =>
    provider === "gitlab"
      ? json({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(document)).toString("base64"),
        })
      : json(document);
  const remote = { groups: [], hosting: {}, modifiedAt: 1 };
  for (const absent of [false, true]) {
    for (const changed of [false, true]) {
      test(`${provider}: ${absent ? "absent" : "existing"} baseline ${
        changed ? "rejects changed" : "allows stable"
      } remote head before writes`, async () => {
        config.hosting = hosting(provider);
        const fetcher = create();
        globalThis.fetch = async (raw) =>
          `${raw}`.includes("/branches/")
            ? json(
                provider === "gitlab"
                  ? { commit: { id: "before" } }
                  : { target: { hash: "before" } }
              )
            : absent
            ? json({}, 404)
            : readDocument(remote);
        assert.deepEqual(
          await fetcher.getCurrentConfig(),
          absent ? null : remote
        );
        let writes = 0;
        globalThis.fetch = async (raw, options) => {
          const request = { url: new URL(`${raw}`), options: options! };
          if (options?.method === "POST") {
            writes++;
            return json({ id: "new" }, 201);
          }
          if (stage(request) === "branch") {
            return json(
              provider === "gitlab"
                ? { commit: { id: changed ? "after" : "before" } }
                : { target: { hash: changed ? "after" : "before" } }
            );
          }
          return json({}, 404);
        };
        if (changed) {
          await assert.rejects(
            () =>
              fetcher.publish("main", [
                { filePath: "config.json", content: "{}" },
              ]),
            { status: 409 }
          );
          assert.equal(writes, 0);
        } else {
          await fetcher.publish("main", [
            { filePath: "config.json", content: "{}" },
          ]);
          assert.equal(writes, 1);
        }
      });
    }
  }

  test(`${provider}: invalid documents never advance the known baseline head`, async () => {
    config.hosting = hosting(provider);
    const fetcher = create();
    let head = "before";
    let document: unknown = remote;
    globalThis.fetch = async (raw) =>
      `${raw}`.includes("/branches/")
        ? json(
            provider === "gitlab"
              ? { commit: { id: head } }
              : { target: { hash: head } }
          )
        : readDocument(document);
    await fetcher.getCurrentConfig();
    head = "after";
    document = null;
    await assert.rejects(
      () => fetcher.getCurrentConfig(),
      /Invalid .* config document/
    );
    let writes = 0;
    globalThis.fetch = async (_raw, options) => {
      if (options?.method === "POST") {
        writes++;
        return json({}, 201);
      }
      return json(
        provider === "gitlab"
          ? { commit: { id: "after" } }
          : { target: { hash: "after" } }
      );
    };
    await assert.rejects(() => fetcher.publish("main", []), { status: 409 });
    assert.equal(writes, 0);
  });

  test(`${provider}: stale read success cannot install a baseline head after the context changes`, async () => {
    config.hosting = hosting(provider);
    const fetcher = create();
    globalThis.fetch = async (raw) => {
      (config.hosting as GitHosting).accessToken = "token-b";
      return `${raw}`.includes("/branches/")
        ? json(
            provider === "gitlab"
              ? { commit: { id: "stale" } }
              : { target: { hash: "stale" } }
          )
        : readDocument(remote);
    };
    await fetcher.getCurrentConfig();
    config.hosting = hosting(provider);
    let writes = 0;
    globalThis.fetch = async (_raw, options) => {
      if (options?.method === "POST") {
        writes++;
        return json({}, 201);
      }
      return json(
        provider === "gitlab"
          ? { commit: { id: "current" } }
          : { target: { hash: "current" } }
      );
    };
    await fetcher.publish("main", []);
    assert.equal(writes, 1);
  });
}
