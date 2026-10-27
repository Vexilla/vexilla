import { test, expect, Page } from "@playwright/test";

type Provider = "github" | "gitlab" | "bitbucket";

function initialConfig(provider: Provider) {
  return {
    modifiedAt: 10,
    groups: [
      { groupId: "local", name: "Local draft", features: {}, environments: {} },
    ],
    hosting: {
      provider,
      providerType: "git",
      accessToken: "test-token",
      repositoryId: provider === "bitbucket" ? "repo" : "10",
      repositoryName: "repo",
      owner: provider === "bitbucket" ? "work" : "owner",
      ...(provider === "github" ? { installationId: "1" } : {}),
      ...(provider === "bitbucket" ? { workspaceId: "work" } : {}),
      targetBranch: "main",
      branchIsValid: false,
      shouldCreatePullRequest: false,
      branchNamePrefix: "vexilla-",
    },
  };
}

async function openSettings(page: Page, provider: Provider) {
  const initial = initialConfig(provider);
  const remote = {
    ...initial,
    modifiedAt: 5,
    hosting: { ...initial.hosting, accessToken: "" },
  };
  await page.addInitScript((initial) => {
    // Keep the browser's saved edits on reload.
    if (!localStorage.getItem("config")) {
      localStorage.setItem("config", JSON.stringify(initial));
    }
  }, initial);

  const requests: string[] = [];
  const unexpected: string[] = [];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const branches = ["main", "vexilla-draft", "review-draft"].map((name) => ({
    name,
  }));
  await page.route(
    /^https:\/\/(?:api\.github\.com|gitlab\.com|api\.bitbucket\.org)\//,
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      requests.push(request.url());
      if (request.method() !== "GET") {
        unexpected.push(`${request.method()} ${path}`);
        return route.fulfill({ status: 400, json: {} });
      }
      if (path === "/user/installations") {
        return route.fulfill({
          json: { installations: [{ id: 1, html_url: "Test installation" }] },
        });
      }
      if (path === "/user/installations/1/repositories") {
        return route.fulfill({
          json: {
            repositories: [
              {
                id: 10,
                name: "repo",
                owner: { login: "owner" },
                default_branch: "main",
              },
            ],
          },
        });
      }
      if (path === "/api/v4/projects") {
        return route.fulfill({
          json: [
            {
              id: 10,
              name: "repo",
              path: "repo",
              namespace: { path: "owner" },
              default_branch: "main",
            },
          ],
        });
      }
      if (path === "/2.0/user/permissions/workspaces") {
        return route.fulfill({
          json: { values: [{ workspace: { slug: "work", name: "Work" } }] },
        });
      }
      if (path === "/2.0/repositories/work") {
        return route.fulfill({
          json: {
            values: [
              { name: "repo", slug: "repo", mainbranch: { name: "main" } },
            ],
          },
        });
      }
      if (path.endsWith("/branches")) {
        return route.fulfill({
          json: provider === "bitbucket" ? { values: branches } : branches,
        });
      }
      if (path.endsWith("/branches/main")) {
        return route.fulfill({
          json:
            provider === "github"
              ? { commit: { sha: "head-main" } }
              : provider === "gitlab"
              ? { commit: { id: "head-main" } }
              : { target: { hash: "head-main" } },
        });
      }
      if (path.includes("/git/trees/")) {
        return route.fulfill({
          json: { tree: [{ path: "config.json", sha: "blob" }] },
        });
      }
      if (path.endsWith("/repository/tree")) {
        return route.fulfill({ json: [{ path: "config.json" }] });
      }
      if (path.endsWith("/src/head-main/")) {
        return route.fulfill({ json: { values: [{ path: "config.json" }] } });
      }
      if (
        path.endsWith("/git/blobs/blob") ||
        path.endsWith("/repository/files/config.json")
      ) {
        return route.fulfill({
          json: {
            encoding: "base64",
            content: Buffer.from(JSON.stringify(remote)).toString("base64"),
          },
        });
      }
      if (path.endsWith("/src/head-main/config.json")) {
        return route.fulfill({ json: remote });
      }
      unexpected.push(`GET ${path}`);
      return route.fulfill({ status: 404, json: {} });
    }
  );

  await page.goto("/?logged_in");
  await expect
    .poll(async () => (await readIdentity(page)).baselineReady)
    .toBe(true);
  await expect
    .poll(async () => (await readIdentity(page)).selection.branchIsValid)
    .toBe(true);
  await expect(
    page.getByRole("textbox", { name: "Repository", exact: true })
  ).toHaveValue(`${initial.hosting.owner}/repo`);
  // Finish discovery, branch validation, and the baseline read before testing
  // a local preference. Later provider responses must not mask subscriptions.
  await page.waitForLoadState("networkidle");
  return { requests, unexpected, errors };
}

const readIdentity = (page: Page) =>
  page.evaluate(async () => {
    const {
      config,
      configReadRefresh,
      remoteConfig,
      remoteMetadata,
      remoteReadAuthority,
      isRemoteBaselineReady,
    } = await import("/src/stores/config-valtio.ts");
    const { gitLocationKey, gitReadContextKey } = await import(
      "/src/utils/fetcher.ts"
    );
    const {
      provider,
      repositoryId,
      owner,
      repositoryName,
      targetBranch,
      branchIsValid,
    } = config.hosting as any;
    return JSON.parse(
      JSON.stringify({
        selection: {
          provider,
          repositoryId,
          owner,
          repositoryName,
          targetBranch,
          branchIsValid,
        },
        location: gitLocationKey(config.hosting),
        context: gitReadContextKey(config.hosting),
        authority: remoteReadAuthority,
        refresh: configReadRefresh.revision,
        metadata: remoteMetadata,
        baseline: remoteConfig,
        baselineReady: isRemoteBaselineReady(),
      })
    );
  });

for (const provider of ["github", "gitlab", "bitbucket"] as const) {
  test(`${provider}: publication preferences render immediately and preserve the remote baseline`, async ({
    page,
  }) => {
    const { requests, unexpected, errors } = await openSettings(page, provider);
    const before = await readIdentity(page);
    const readsBefore = [...requests];
    const toggle = page.getByRole("switch", { name: "Create pull Request?" });
    const toggleLabel = page.getByText("Create pull Request?", { exact: true });
    const prefix = page.getByRole("textbox", { name: "Branch Name Prefix" });
    const target = page.getByRole("textbox", {
      name: "Target Branch",
      exact: true,
    });

    await expect(toggle).not.toBeChecked();
    await expect(prefix).toHaveCount(0);
    await target.click();
    await expect(page.getByText("review-draft", { exact: true })).toBeVisible();
    await expect(page.getByText("vexilla-draft", { exact: true })).toHaveCount(
      0
    );
    await page.keyboard.press("Escape");

    await toggleLabel.click();
    await expect(toggle).toBeChecked();
    await expect(prefix).toBeVisible();
    await toggleLabel.click();
    await expect(toggle).not.toBeChecked();
    await expect(prefix).toHaveCount(0);
    await toggleLabel.click();
    await expect(toggle).toBeChecked();
    await prefix.fill("review-");
    await expect(prefix).toHaveValue("review-");
    await target.click();
    await expect(
      page.getByText("vexilla-draft", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("review-draft", { exact: true })).toHaveCount(
      0
    );
    await page.keyboard.press("Escape");

    await expect
      .poll(() =>
        page.evaluate(() => {
          const hosting = JSON.parse(localStorage.getItem("config")!).hosting;
          return {
            shouldCreatePullRequest: hosting.shouldCreatePullRequest,
            branchNamePrefix: hosting.branchNamePrefix,
          };
        })
      )
      .toEqual({ shouldCreatePullRequest: true, branchNamePrefix: "review-" });
    expect(await readIdentity(page)).toEqual(before);
    expect(requests).toEqual(readsBefore);
    expect(unexpected).toEqual([]);
    expect(errors).toEqual([]);

    await page.reload();
    await expect(toggle).toBeChecked();
    await expect(prefix).toHaveValue("review-");
    await expect(target).toHaveValue("main");
    await expect
      .poll(async () => (await readIdentity(page)).baselineReady)
      .toBe(true);
    await target.click();
    await expect(
      page.getByText("vexilla-draft", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("review-draft", { exact: true })).toHaveCount(
      0
    );
    expect(unexpected).toEqual([]);
    expect(errors).toEqual([]);
  });
}
