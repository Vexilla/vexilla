import { test, expect, Page, Route } from "@playwright/test";

type Provider = "gitlab" | "bitbucket";
const repositories = [
  {
    id: 10,
    slug: "repo-a",
    name: "Repo A",
    owner: "owner",
    defaultBranch: "main",
  },
  {
    id: 20,
    slug: "repo-b",
    name: "Repo B",
    owner: "owner",
    defaultBranch: "develop",
  },
];
const readState = (page: Page) =>
  page.evaluate(async () => {
    const { config, remoteConfig, remoteMetadata, validation } = await import(
      "/src/stores/config-valtio.ts"
    );
    return JSON.parse(
      JSON.stringify({
        config,
        remoteConfig,
        remoteMetadata,
        validationSuccess: validation.result.success,
      })
    );
  });
async function changeHosting(page: Page, fields: Record<string, unknown>) {
  const store = await page.evaluateHandle(async () => {
    const { config } = await import("/src/stores/config-valtio.ts");
    return config;
  });
  try {
    await store.evaluate((config, fields) => {
      Object.assign(config.hosting, fields);
    }, fields);
  } finally {
    await store.dispose();
  }
}
const hosting = (provider: Provider) => ({
  provider,
  providerType: "git",
  accessToken: "test-token",
  repositoryId: provider === "gitlab" ? "10" : "repo-a",
  repositoryName: "repo-a",
  owner: provider === "gitlab" ? "owner" : "work",
  workspaceId: "work",
  targetBranch: "main",
  branchIsValid: false,
  shouldCreatePullRequest: false,
  branchNamePrefix: "vexilla-",
});
const local = (provider: Provider) => ({
  modifiedAt: 10,
  hosting: hosting(provider),
  groups: [
    { groupId: "local", name: "Local draft", features: {}, environments: {} },
  ],
});
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("textbox", { name: label, exact: true }).click();
  await page.getByText(option, { exact: true }).click();
}
async function mockProvider(
  page: Page,
  provider: Provider,
  options: {
    initial?: any;
    count?: number;
    twoWorkspaces?: boolean;
    intercept?: (route: Route) => Promise<boolean>;
  } = {}
) {
  if (options.initial) {
    await page.addInitScript((initial) => {
      localStorage.setItem("config", JSON.stringify(initial));
      localStorage.setItem(
        "remoteConfig",
        JSON.stringify({ ...initial, modifiedAt: 5 })
      );
      localStorage.setItem(
        "remoteMetadata",
        JSON.stringify({ remoteModifiedAt: 5, remoteMergedAt: 7 })
      );
    }, options.initial);
  }
  const requests: { url: string; token: string | undefined }[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(`**/oauth/${provider}`, (route) =>
    route.fulfill({ json: { access_token: "test-token" } })
  );
  const origin =
    provider === "gitlab" ? "gitlab\\.com" : "api\\.bitbucket\\.org";
  await page.route(
    new RegExp(`^https://(?:${origin}|changed\\.example)/`),
    async (route) => {
      const url = new URL(route.request().url()),
        path = url.pathname;
      requests.push({
        url: url.href,
        token: route.request().headers().authorization,
      });
      if (options.intercept && (await options.intercept(route))) {
        return;
      }
      const available = repositories.slice(0, options.count ?? 2);
      if (provider === "gitlab" && path === "/api/v4/projects") {
        return route.fulfill({
          json: available.map((r) => ({
            id: r.id,
            name: r.name,
            path: r.slug,
            namespace: { path: r.owner },
            default_branch: r.defaultBranch,
          })),
        });
      }
      if (path.endsWith("/permissions/workspaces")) {
        return route.fulfill({
          json: {
            values: ["work", ...(options.twoWorkspaces ? ["second"] : [])].map(
              (slug) => ({
                workspace: {
                  slug,
                  name: slug === "work" ? "Work One" : "Work Two",
                },
              })
            ),
          },
        });
      }
      if (
        provider === "bitbucket" &&
        /\/repositories\/(work|second)$/.test(path)
      ) {
        return route.fulfill({
          json: {
            values: available.map((r) => ({
              name: r.name,
              slug: r.slug,
              owner: { username: "account-owner" },
              mainbranch: { name: r.defaultBranch },
            })),
          },
        });
      }
      if (
        /\/repository\/branches\/?$/.test(path) ||
        path.endsWith("/refs/branches")
      ) {
        return route.fulfill({
          json:
            provider === "gitlab"
              ? [{ name: "main" }, { name: "develop" }, { name: "release" }]
              : {
                  values: [
                    { name: "main" },
                    { name: "develop" },
                    { name: "release" },
                  ],
                },
        });
      }
      if (/\/branches\/[^/]+$/.test(path)) {
        const head = `head-${decodeURIComponent(path.split("/").at(-1)!)}`;
        return route.fulfill({
          json:
            provider === "gitlab"
              ? { commit: { id: head } }
              : { target: { hash: head } },
        });
      }
      if (path.endsWith("/repository/tree") || /\/src\/[^/]+\/$/.test(path)) {
        return route.fulfill({
          json:
            provider === "gitlab"
              ? [{ path: "config.json" }]
              : { values: [{ path: "config.json" }] },
        });
      }
      if (
        path.endsWith("/files/config.json") ||
        path.endsWith("/config.json")
      ) {
        const remote = {
          modifiedAt: 50,
          hosting: { ...hosting(provider), accessToken: "" },
          groups: [
            {
              groupId: "remote",
              name: url.href,
              features: {},
              environments: {},
            },
          ],
        };
        return route.fulfill({
          json:
            provider === "gitlab"
              ? {
                  encoding: "base64",
                  content: Buffer.from(JSON.stringify(remote)).toString(
                    "base64"
                  ),
                }
              : remote,
        });
      }
      return route.fulfill({
        status: 404,
        json: { message: `Unmocked ${url}` },
      });
    }
  );
  return { requests, errors };
}
function assertClean(requests: { url: string }[], errors: string[]) {
  expect(
    requests.filter(({ url }) =>
      /undefined|null|\[object Object\]|\/\/\/|\/repositories\/\//.test(
        decodeURIComponent(url)
      )
    )
  ).toEqual([]);
  expect(errors).toEqual([]);
}

for (const provider of ["gitlab", "bitbucket"] as const) {
  const owner = provider === "gitlab" ? "owner" : "work";
  const idA = provider === "gitlab" ? "10" : "repo-a";
  const idB = provider === "gitlab" ? "20" : "repo-b";
  const repositoryPath = (id: string) =>
    provider === "gitlab"
      ? `/projects/${id}/repository/`
      : `/repositories/work/${id}/`;
  for (const count of [0, 1, 2]) {
    test(`${provider}: fresh token-only callback with ${count} repositories`, async ({
      page,
    }) => {
      const { requests, errors } = await mockProvider(page, provider, {
        count,
      });
      await page.goto(`/auth/callback/${provider}?code=fake`);
      await expect(
        page.getByRole("button", { name: "Logged in", exact: true })
      ).toBeVisible();
      await expect
        .poll(async () => (await readState(page)).config.hosting.repositoryId)
        .toBe(count === 1 ? idA : "");
      if (count === 1) {
        await expect
          .poll(
            async () => (await readState(page)).remoteMetadata.remoteModifiedAt
          )
          .toBe(50);
        await expect
          .poll(
            async () => (await readState(page)).config.hosting.branchIsValid
          )
          .toBe(true);
        expect((await readState(page)).config.hosting).toMatchObject({
          owner,
          repositoryName: "repo-a",
          targetBranch: "main",
          accessToken: "test-token",
        });
        expect((await readState(page)).remoteConfig.hosting.accessToken).toBe(
          ""
        );
        if (provider === "gitlab") {
          expect(
            requests.filter(({ url }) => url.includes("/branches/main"))
          ).not.toHaveLength(0);
        }
      } else {
        expect((await readState(page)).config.hosting.targetBranch).toBe("");
        expect(
          requests.some(({ url }) =>
            /\/repository\/|\/refs\/|\/src\//.test(url)
          )
        ).toBe(false);
      }
      assertClean(requests, errors);
    });
  }

  test(`${provider}: repository/branch changes refresh immediately; refresh preserves explicit branch; clear stops polling`, async ({
    page,
  }) => {
    const { requests, errors } = await mockProvider(page, provider);
    await page.clock.install();
    await page.goto(`/auth/callback/${provider}?code=fake`);
    await choose(page, "Repository", `${owner}/Repo A`);
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.remoteModifiedAt)
      .toBe(50);
    await choose(page, "Target Branch", "release");
    await expect
      .poll(() => requests.some(({ url }) => url.endsWith("/branches/release")))
      .toBe(true);
    await page
      .getByRole("button", { name: "Refresh repositories and branches" })
      .click();
    await expect(
      page.getByRole("textbox", { name: "Target Branch", exact: true })
    ).toHaveValue("release");
    await choose(page, "Repository", `${owner}/Repo B`);
    await expect
      .poll(() =>
        requests.some(
          ({ url }) =>
            url.includes(repositoryPath(idB)) &&
            url.endsWith("/branches/develop")
        )
      )
      .toBe(true);
    expect((await readState(page)).config.hosting).toMatchObject({
      repositoryId: idB,
      targetBranch: "develop",
    });
    await page
      .getByRole("button", { name: "Clear repository selection" })
      .click();
    await expect
      .poll(async () => (await readState(page)).config.hosting.repositoryId)
      .toBe("");
    expect((await readState(page)).config.hosting).toMatchObject({
      owner: "",
      repositoryName: "",
      targetBranch: "",
      branchIsValid: false,
      accessToken: "test-token",
    });
    expect((await readState(page)).remoteMetadata).toMatchObject({
      remoteModifiedAt: 0,
      remoteMergedAt: 0,
    });
    const before = requests.length;
    await page.clock.fastForward(60000);
    expect(requests.length).toBe(before);
    assertClean(requests, errors);
  });

  test(`${provider}: polling continues when the hosting modal is closed`, async ({
    page,
  }) => {
    const { requests, errors } = await mockProvider(page, provider, {
      initial: local(provider),
    });
    await page.clock.install();
    await page.goto("/");
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.remoteModifiedAt)
      .toBe(50);
    const before = requests.length;
    await page.clock.fastForward(30000);
    await expect.poll(() => requests.length).toBeGreaterThan(before);
    expect((await readState(page)).config.groups).toEqual(
      local(provider).groups
    );
    assertClean(requests, errors);
  });

  test(`${provider}: refreshed discovery removes an inaccessible selection`, async ({
    page,
  }) => {
    let removed = false;
    const { requests, errors } = await mockProvider(page, provider, {
      intercept: async (route) => {
        const path = new URL(route.request().url()).pathname;
        const discovery =
          provider === "gitlab"
            ? path === "/api/v4/projects"
            : path === "/2.0/repositories/work";
        if (removed && discovery) {
          await route.fulfill({
            json: provider === "gitlab" ? [] : { values: [] },
          });
          return true;
        }
        return false;
      },
    });
    await page.goto(`/auth/callback/${provider}?code=fake`);
    await choose(page, "Repository", `${owner}/Repo A`);
    await expect
      .poll(async () => (await readState(page)).config.hosting.branchIsValid)
      .toBe(true);
    removed = true;
    await page
      .getByRole("button", { name: "Refresh repositories and branches" })
      .click();
    await expect
      .poll(async () => (await readState(page)).config.hosting.repositoryId)
      .toBe("");
    expect((await readState(page)).config.hosting).toMatchObject({
      targetBranch: "",
      accessToken: "test-token",
    });
    assertClean(requests, errors);
  });

  for (const replacement of [
    "repository",
    "branch",
    "token",
    "origin",
  ] as const) {
    for (const stale401 of [false, true]) {
      test(`${provider}: late ${
        stale401 ? "401" : "success"
      } from old ${replacement} cannot affect active state`, async ({
        page,
      }) => {
        let release!: () => void,
          delayed = false,
          delivered = false;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        page.once("close", () => release());
        const { requests, errors } = await mockProvider(page, provider, {
          initial: local(provider),
          intercept: async (route) => {
            const path = new URL(route.request().url()).pathname;
            if (!delayed && path.endsWith("/branches/main")) {
              delayed = true;
              await gate;
              await route.fulfill(
                stale401
                  ? { status: 401, json: {} }
                  : {
                      json:
                        provider === "gitlab"
                          ? { commit: { id: "old-head" } }
                          : { target: { hash: "old-head" } },
                    }
              );
              delivered = true;
              return true;
            }
            return false;
          },
        });
        await page.goto("/"); // Discovery is unmounted; App still owns polling.
        await expect.poll(() => delayed).toBe(true);
        await changeHosting(
          page,
          replacement === "repository"
            ? {
                repositoryId: idB,
                repositoryName: "repo-b",
                targetBranch: "develop",
              }
            : replacement === "branch"
            ? { targetBranch: "release" }
            : replacement === "token"
            ? { accessToken: "new-token" }
            : { baseUrl: "https://changed.example" }
        );
        await expect
          .poll(
            async () => (await readState(page)).remoteMetadata.remoteModifiedAt
          )
          .toBe(50);
        const active = await readState(page);
        release();
        await expect.poll(() => delivered).toBe(true);
        if (!stale401) {
          await expect
            .poll(() =>
              requests.some(
                ({ url }) => url.includes("old-head") && /config.json/.test(url)
              )
            )
            .toBe(true);
        }
        await expect
          .poll(async () => (await readState(page)).remoteConfig)
          .toEqual(active.remoteConfig);
        expect((await readState(page)).config.hosting.accessToken).toBe(
          replacement === "token" ? "new-token" : "test-token"
        );
        expect((await readState(page)).config.groups).toEqual(
          local(provider).groups
        );
        assertClean(requests, errors);
      });
    }
  }

  test(`${provider}: stale branch validation cannot mark the new branch valid`, async ({
    page,
  }) => {
    let release!: () => void,
      delayed = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    page.once("close", () => release());
    const { requests, errors } = await mockProvider(page, provider, {
      initial: local(provider),
      intercept: async (route) => {
        const url = new URL(route.request().url());
        const validation =
          provider === "gitlab"
            ? url.searchParams.get("ref") === "main"
            : url.pathname.endsWith("/branches/main");
        if (validation && !delayed) {
          delayed = true;
          await gate;
          await route.fulfill({
            json:
              provider === "gitlab"
                ? [{ path: "README.md" }]
                : { target: { hash: "head-main" } },
          });
          return true;
        }
        const empty =
          provider === "gitlab"
            ? url.searchParams.get("ref") === "release"
            : url.pathname.includes("/src/head-release/");
        if (empty) {
          await route.fulfill({
            json: provider === "gitlab" ? [] : { values: [] },
          });
          return true;
        }
        return false;
      },
    });
    await page.goto("/?logged_in");
    await expect.poll(() => delayed).toBe(true);
    await choose(page, "Target Branch", "release");
    await expect(
      page.getByText("This repo or branch is empty.", { exact: true })
    ).toBeVisible();
    release();
    expect((await readState(page)).config.hosting.branchIsValid).toBe(false);
    assertClean(requests, errors);
  });

  for (const failure of [401, 403, 404, 500, "network"] as const) {
    test(`${provider}: new-location ${failure} preserves drafts and selection; only 401 clears authentication`, async ({
      page,
    }) => {
      const { requests, errors } = await mockProvider(page, provider, {
        initial: local(provider),
        intercept: async (route) => {
          if (route.request().url().endsWith("/branches/release")) {
            if (failure === "network") {
              await route.abort("failed");
            } else {
              await route.fulfill({ status: failure, json: {} });
            }
            return true;
          }
          return false;
        },
      });
      await page.goto("/");
      await expect
        .poll(
          async () => (await readState(page)).remoteMetadata.remoteModifiedAt
        )
        .toBe(50);
      await changeHosting(page, { targetBranch: "release" });
      await expect
        .poll(() =>
          requests.some(({ url }) => url.endsWith("/branches/release"))
        )
        .toBe(true);
      await expect
        .poll(async () => (await readState(page)).remoteMetadata)
        .toMatchObject({ remoteModifiedAt: 0, remoteMergedAt: 0 });
      await expect
        .poll(async () => (await readState(page)).config.hosting.accessToken)
        .toBe(failure === 401 ? "" : "test-token");
      const state = await readState(page);
      expect(state.config.hosting).toMatchObject({
        repositoryId: idA,
        targetBranch: "release",
      });
      expect(state.config.groups).toEqual(local(provider).groups);
      expect(state.remoteConfig.modifiedAt).toBe(0);
      assertClean(requests, errors);
    });
  }
  for (const stale401 of [false, true]) {
    test(`${provider}: obsolete repository discovery ${
      stale401 ? "401" : "success"
    } cannot undo reauthentication`, async ({ page }) => {
      let release!: () => void,
        delayed = false,
        delivered = false;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      page.once("close", () => release());
      const { requests, errors } = await mockProvider(page, provider, {
        count: 1,
        intercept: async (route) => {
          const path = new URL(route.request().url()).pathname;
          const discovery =
            provider === "gitlab"
              ? path === "/api/v4/projects"
              : path === "/2.0/repositories/work";
          if (
            discovery &&
            route.request().headers().authorization === "Bearer test-token" &&
            !delayed
          ) {
            delayed = true;
            await gate;
            await route.fulfill(
              stale401
                ? { status: 401, json: {} }
                : {
                    json:
                      provider === "gitlab"
                        ? [
                            {
                              id: 20,
                              path: "repo-b",
                              name: "Repo B",
                              namespace: { path: "owner" },
                              default_branch: "develop",
                            },
                          ]
                        : {
                            values: [
                              {
                                slug: "repo-b",
                                name: "Repo B",
                                mainbranch: { name: "develop" },
                              },
                            ],
                          },
                  }
            );
            delivered = true;
            return true;
          }
          return false;
        },
      });
      await page.goto(`/auth/callback/${provider}?code=fake`);
      // Discovery may start before the OAuth callback finishes navigating.
      await page.waitForURL("/?logged_in");
      await expect(
        page.getByRole("button", { name: "Logged in", exact: true })
      ).toBeVisible();
      await expect.poll(() => delayed).toBe(true);
      await changeHosting(page, { accessToken: "new-token" });
      await expect
        .poll(
          async () => (await readState(page)).remoteMetadata.remoteModifiedAt
        )
        .toBe(50);
      release();
      await expect.poll(() => delivered).toBe(true);
      expect((await readState(page)).config.hosting).toMatchObject({
        accessToken: "new-token",
        repositoryId: idA,
        targetBranch: "main",
      });
      assertClean(requests, errors);
    });
  }
}

for (const stale401 of [false, true]) {
  test(`bitbucket: workspace switch clears dependent selection and ignores stale discovery ${
    stale401 ? "401" : "success"
  }`, async ({ page }) => {
    let release!: () => void,
      delayed = false,
      delivered = false;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    page.once("close", () => release());
    const { requests, errors } = await mockProvider(page, "bitbucket", {
      twoWorkspaces: true,
      intercept: async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (path === "/2.0/repositories/work") {
          delayed = true;
          await gate;
          await route.fulfill(
            stale401
              ? { status: 401, json: {} }
              : {
                  json: {
                    values: [
                      {
                        slug: "repo-a",
                        name: "Repo A",
                        mainbranch: { name: "main" },
                      },
                    ],
                  },
                }
          );
          delivered = true;
          return true;
        }
        if (path === "/2.0/repositories/second") {
          await route.fulfill({
            json: {
              values: [
                {
                  slug: "repo-b",
                  name: "Repo B",
                  mainbranch: { name: "develop" },
                },
              ],
            },
          });
          return true;
        }
        return false;
      },
    });
    await page.goto("/auth/callback/bitbucket?code=fake");
    await choose(page, "Workspace", "Work One");
    await expect.poll(() => delayed).toBe(true);
    await choose(page, "Workspace", "Work Two");
    await expect
      .poll(async () => (await readState(page)).config.hosting.repositoryId)
      .toBe("repo-b");
    release();
    await expect.poll(() => delivered).toBe(true);
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.remoteModifiedAt)
      .toBe(50);
    expect((await readState(page)).config.hosting).toMatchObject({
      workspaceId: "second",
      repositoryId: "repo-b",
      owner: "second",
      repositoryName: "repo-b",
      targetBranch: "develop",
      accessToken: "test-token",
    });
    assertClean(requests, errors);
  });
}

for (const provider of ["gitlab", "bitbucket"] as const) {
  const owner = provider === "gitlab" ? "owner" : "work";
  const discoveryPath =
    provider === "gitlab" ? "/api/v4/projects" : "/2.0/repositories/work";

  test(`${provider}: legacy display metadata migrates without resetting an explicit branch`, async ({
    page,
  }) => {
    const initial = local(provider);
    initial.hosting.repositoryName = "Repo A";
    initial.hosting.targetBranch = "release";
    if (provider === "bitbucket") {
      initial.hosting.repositoryId = "Repo A";
      initial.hosting.owner = "[object Object]";
    }
    const { requests, errors } = await mockProvider(page, provider, {
      initial,
    });
    await page.goto("/?logged_in");
    await expect(
      page.getByRole("textbox", { name: "Repository", exact: true })
    ).toHaveValue(`${owner}/Repo A`);
    await expect
      .poll(async () => (await readState(page)).config.hosting.repositoryName)
      .toBe("repo-a");
    expect((await readState(page)).config.hosting).toMatchObject({
      repositoryId: provider === "gitlab" ? "10" : "repo-a",
      targetBranch: "release",
      owner,
    });
    assertClean(requests, errors);
  });

  test(`${provider}: paginated discovery preserves a selected later-page repository`, async ({
    page,
  }) => {
    const initial = local(provider);
    Object.assign(initial.hosting, {
      repositoryId: provider === "gitlab" ? "20" : "repo-b",
      repositoryName: "repo-b",
      targetBranch: "release",
    });
    let secondPage = false;
    const { requests, errors } = await mockProvider(page, provider, {
      initial,
      intercept: async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname !== discoveryPath) {
          return false;
        }
        const second = url.searchParams.get("page") === "2";
        secondPage ||= second;
        const r = repositories[second ? 1 : 0];
        await route.fulfill(
          provider === "gitlab"
            ? {
                json: [
                  {
                    id: r.id,
                    name: r.name,
                    path: r.slug,
                    namespace: { path: r.owner },
                    default_branch: r.defaultBranch,
                  },
                ],
                headers: second
                  ? {}
                  : {
                      "x-next-page": "2",
                      "Access-Control-Expose-Headers": "X-Next-Page",
                    },
              }
            : {
                json: {
                  values: [
                    {
                      slug: r.slug,
                      name: r.name,
                      mainbranch: { name: r.defaultBranch },
                    },
                  ],
                  ...(second
                    ? {}
                    : { next: `${url.origin}${url.pathname}?page=2` }),
                },
              }
        );
        return true;
      },
    });
    await page.goto("/?logged_in");
    await expect.poll(() => secondPage).toBe(true);
    await expect(
      page.getByRole("textbox", { name: "Repository", exact: true })
    ).toHaveValue(`${owner}/Repo B`);
    expect((await readState(page)).config.hosting.targetBranch).toBe("release");
    assertClean(requests, errors);
  });

  test(`${provider}: transient discovery failure retains options and shows a safe retry error`, async ({
    page,
  }) => {
    let failing = false;
    const { requests, errors } = await mockProvider(page, provider, {
      initial: local(provider),
      intercept: async (route) => {
        if (
          failing &&
          new URL(route.request().url()).pathname === discoveryPath
        ) {
          await route.fulfill({
            status: 500,
            json: { message: "sensitive server details" },
          });
          return true;
        }
        return false;
      },
    });
    await page.goto("/?logged_in");
    await expect(
      page.getByRole("textbox", { name: "Repository", exact: true })
    ).toHaveValue(`${owner}/Repo A`);
    failing = true;
    await page
      .getByRole("button", { name: "Refresh repositories and branches" })
      .click();
    await expect(
      page.getByText("Could not load repositories. Refresh to try again.")
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Repository", exact: true })
    ).toHaveValue(`${owner}/Repo A`);
    expect((await readState(page)).config.hosting.accessToken).toBe(
      "test-token"
    );
    await expect(page.getByText("sensitive server details")).toHaveCount(0);
    failing = false;
    await page
      .getByRole("button", { name: "Refresh repositories and branches" })
      .click();
    await expect(
      page.getByText("Could not load repositories. Refresh to try again.")
    ).toHaveCount(0);
    assertClean(requests, errors);
  });

  test(`${provider}: failed destination config blocks Publish and verified absence permits first publication`, async ({
    page,
  }) => {
    let absent = false;
    const initial = local(provider);
    initial.hosting.branchIsValid = true;
    const { requests, errors } = await mockProvider(page, provider, {
      initial,
      intercept: async (route) => {
        const url = new URL(route.request().url());
        const file = url.pathname.endsWith("/config.json");
        const destination =
          provider === "gitlab"
            ? url.searchParams.get("ref") === "head-release"
            : url.pathname.includes("/head-release/");
        if (file && destination) {
          await route.fulfill({ status: absent ? 404 : 500, json: {} });
          return true;
        }
        const first =
          provider === "gitlab"
            ? url.searchParams.get("ref") === "head-first"
            : url.pathname.includes("/head-first/");
        if (file && first) {
          await route.fulfill({ status: 404, json: {} });
          return true;
        }
        return false;
      },
    });
    await page.goto("/");
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.remoteModifiedAt)
      .toBe(50);
    await changeHosting(page, { targetBranch: "release" });
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.status)
      .toBe("error");
    await expect(
      page.getByRole("button", { name: "Publish", exact: true })
    ).toBeDisabled();
    absent = true;
    await changeHosting(page, { targetBranch: "first" });
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.status)
      .toBe("absent");
    await expect(
      page.getByRole("button", { name: "Publish", exact: true })
    ).toBeEnabled();
    expect((await readState(page)).config.groups).toEqual(initial.groups);
    assertClean(requests, errors);
  });

  test(`${provider}: an empty repository initializes main and immediately retries the config read`, async ({
    page,
  }) => {
    let initialized = false;
    const { requests, errors } = await mockProvider(page, provider, {
      count: 1,
      intercept: async (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        if (path === discoveryPath) {
          await route.fulfill({
            json:
              provider === "gitlab"
                ? [
                    {
                      id: 10,
                      name: "Repo A",
                      path: "repo-a",
                      namespace: { path: "owner" },
                      default_branch: null,
                    },
                  ]
                : {
                    values: [
                      { slug: "repo-a", name: "Repo A", mainbranch: null },
                    ],
                  },
          });
          return true;
        }
        if (route.request().method() === "POST") {
          expect(path).toBe(
            provider === "gitlab"
              ? "/api/v4/projects/10/repository/commits"
              : "/2.0/repositories/work/repo-a/src"
          );
          if (provider === "gitlab") {
            expect(route.request().postDataJSON().branch).toBe("main");
          } else {
            expect(route.request().postData()).toContain("main");
          }
          initialized = true;
          await route.fulfill({ json: { id: "created" } });
          return true;
        }
        const branchRead =
          path.endsWith("/branches/main") || path.endsWith("/repository/tree");
        if (!initialized && branchRead) {
          await route.fulfill({ status: 404, json: {} });
          return true;
        }
        if (initialized && path.endsWith("/config.json")) {
          await route.fulfill({ status: 404, json: {} });
          return true;
        }
        return false;
      },
    });
    await page.goto(`/auth/callback/${provider}?code=fake`);
    await expect(
      page.getByRole("button", { name: "Initialize", exact: true })
    ).toBeVisible();
    expect((await readState(page)).config.hosting.targetBranch).toBe("main");
    await page.getByRole("button", { name: "Initialize", exact: true }).click();
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.status)
      .toBe("absent");
    await expect
      .poll(async () => (await readState(page)).config.hosting.branchIsValid)
      .toBe(true);
    await expect
      .poll(async () => (await readState(page)).validationSuccess)
      .toBe(true);
    await expect(
      page.getByRole("button", {
        name: "Publish",
        exact: true,
        includeHidden: true,
      })
    ).toBeEnabled();
    assertClean(requests, errors);
  });
}

for (const provider of ["gitlab", "bitbucket"] as const) {
  test(`${provider}: a fresh callback with a verified absent config permits first publication`, async ({
    page,
  }) => {
    const { requests, errors } = await mockProvider(page, provider, {
      count: 1,
      intercept: async (route) => {
        if (new URL(route.request().url()).pathname.endsWith("/config.json")) {
          await route.fulfill({ status: 404, json: {} });
          return true;
        }
        return false;
      },
    });
    await page.goto(`/auth/callback/${provider}?code=fake`);
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.status)
      .toBe("absent");
    await expect
      .poll(async () => (await readState(page)).validationSuccess)
      .toBe(true);
    await expect(
      page.getByRole("button", {
        name: "Publish",
        exact: true,
        includeHidden: true,
      })
    ).toBeEnabled();
    assertClean(requests, errors);
  });
}
