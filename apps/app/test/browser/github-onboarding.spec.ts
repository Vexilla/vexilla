import { test, expect, Page, Route } from "@playwright/test";

const repoA = {
  id: 10,
  name: "repo-a",
  owner: { login: "owner-a" },
  default_branch: "main",
};
const repoB = {
  id: 20,
  name: "repo-b",
  owner: { login: "owner-b" },
  default_branch: "develop",
};
const installations = [
  { id: 1, html_url: "Installation One" },
  { id: 2, html_url: "Installation Two" },
];
const hosting = () => ({
  provider: "github",
  providerType: "git",
  accessToken: "test-token",
  installationId: "1",
  repositoryId: "10",
  owner: "owner-a",
  repositoryName: "repo-a",
  targetBranch: "main",
  branchIsValid: false,
  shouldCreatePullRequest: false,
  branchNamePrefix: "vexilla-",
});
const baseline = (name: string, modifiedAt = 50) => ({
  modifiedAt,
  groups: [{ groupId: "remote", name, features: {}, environments: {} }],
  hosting: { ...hosting(), accessToken: "" },
});
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
const changeHosting = (page: Page, fields: Record<string, unknown>) =>
  page.evaluate(async (fields) => {
    const { config } = await import("/src/stores/config-valtio.ts");
    Object.assign(config.hosting, fields);
  }, fields);
async function mockGitHub(
  page: Page,
  options: {
    repositories?: (typeof repoA)[];
    initial?: any;
    intercept?: (route: Route) => Promise<boolean>;
    twoInstallations?: boolean;
  } = {}
) {
  if (options.initial) {
    await page.addInitScript((initial) => {
      localStorage.setItem("config", JSON.stringify(initial));
      localStorage.setItem("remoteConfig", JSON.stringify(initial));
      localStorage.setItem(
        "remoteMetadata",
        JSON.stringify({ remoteModifiedAt: 5, remoteMergedAt: 7 })
      );
    }, options.initial);
  }
  const requests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/oauth/github", (route) =>
    route.fulfill({ json: { access_token: "test-token" } })
  );
  await page.route("https://api.github.com/**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(url.pathname);
    if (options.intercept && (await options.intercept(route))) {
      return;
    }
    if (url.pathname === "/user/installations") {
      return route.fulfill({
        json: {
          installations: options.twoInstallations
            ? installations
            : installations.slice(0, 1),
        },
      });
    }
    if (url.pathname.includes("/repositories")) {
      return route.fulfill({
        json: { repositories: options.repositories ?? [repoA, repoB] },
      });
    }
    if (url.pathname.endsWith("/branches")) {
      return route.fulfill({
        json: [
          { name: url.pathname.includes("repo-b") ? "develop" : "main" },
          { name: "release" },
        ],
      });
    }
    if (url.pathname.includes("/branches/")) {
      return route.fulfill({
        json: { commit: { sha: `head-${url.pathname.split("/").at(-1)}` } },
      });
    }
    if (url.pathname.includes("/git/trees/")) {
      return route.fulfill({
        json: { tree: [{ path: "config.json", sha: "blob" }] },
      });
    }
    if (url.pathname.includes("/git/blobs/")) {
      return route.fulfill({
        json: {
          content: Buffer.from(JSON.stringify(baseline(url.pathname))).toString(
            "base64"
          ),
        },
      });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return { requests, errors };
}
function assertClean(requests: string[], errors: string[]) {
  expect(
    requests.filter((path) =>
      /\/repos\/(?:\/|undefined|\s)|\/repos\/[^/]+\/(?:\/|undefined|\s)/.test(
        decodeURIComponent(path)
      )
    )
  ).toEqual([]);
  expect(errors).toEqual([]);
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("textbox", { name: label, exact: true }).click();
  await page.getByText(option, { exact: true }).click();
}

const localDraft = () => ({
  modifiedAt: 10,
  groups: [
    { groupId: "local", name: "Local draft", features: {}, environments: {} },
  ],
  hosting: hosting(),
});
const publishButton = (page: Page) =>
  page.getByRole("button", {
    name: "Publish",
    exact: true,
    includeHidden: true,
  });
const initializeButton = (page: Page) =>
  page.getByRole("button", { name: "Initialize", exact: true });
const refreshRepository = (page: Page) =>
  page
    .getByRole("button", { name: "Refresh repositories and branches" })
    .click();
function deferred(page: Page) {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  page.once("close", release);
  return { waiting, release };
}

async function mockEmptyGitHub(
  page: Page,
  options: {
    initial?: any;
    defaultBranch?: string;
    targetBranch?: string;
    intercept?: (
      route: Route,
      repository: { initialized: boolean; remoteDocument?: any }
    ) => Promise<boolean>;
  } = {}
) {
  const repository: { initialized: boolean; remoteDocument?: any } = {
    initialized: false,
  };
  const targetBranch = options.targetBranch ?? "main";
  const operations: string[] = [];
  const writes: { path: string; payload: any; authorization?: string }[] = [];
  const mocked = await mockGitHub(page, {
    initial: options.initial,
    repositories: [
      { ...repoA, default_branch: options.defaultBranch ?? "main" },
    ],
    intercept: async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      operations.push(`${request.method()} ${path}`);
      const initialization =
        request.method() === "PUT" && path.endsWith("/contents/README.md");
      if (initialization) {
        writes.push({
          path,
          payload: request.postDataJSON(),
          authorization: request.headers().authorization,
        });
      }
      if (options.intercept && (await options.intercept(route, repository))) {
        return true;
      }
      if (initialization) {
        repository.initialized = true;
        await route.fulfill({
          status: 201,
          json: { content: { sha: "readme" } },
        });
        return true;
      }
      if (!path.startsWith("/repos/owner-a/repo-a/")) {
        return false;
      }
      if (path.endsWith("/branches")) {
        await route.fulfill({
          json: repository.initialized ? [{ name: targetBranch }] : [],
        });
        return true;
      }
      if (!repository.initialized && path.includes("/branches/")) {
        await route.fulfill({
          status: 404,
          json: { message: "Branch not found" },
        });
        return true;
      }
      if (path.includes("/git/trees/")) {
        await route.fulfill(
          repository.initialized
            ? {
                json: {
                  tree: [
                    { path: "README.md", sha: "readme" },
                    ...(repository.remoteDocument
                      ? [{ path: "config.json", sha: "external-config" }]
                      : []),
                  ],
                },
              }
            : {
                status: 409,
                json: { message: "Git Repository is empty." },
              }
        );
        return true;
      }
      if (
        repository.remoteDocument &&
        path.endsWith("/git/blobs/external-config")
      ) {
        await route.fulfill({
          json: {
            content: Buffer.from(
              JSON.stringify(repository.remoteDocument)
            ).toString("base64"),
          },
        });
        return true;
      }
      return false;
    },
  });
  return { ...mocked, repository, operations, writes };
}

async function expectInitializationRequired(page: Page) {
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("initialization-required");
  await expect(initializeButton(page)).toBeEnabled();
  await expect(
    page.getByText("This repository needs initialization.")
  ).toBeVisible();
  await expect(publishButton(page)).toBeDisabled();
}

for (const callbackInstallation of [false, true]) {
  for (const count of [0, 1, 2]) {
    test(`fresh callback ${
      callbackInstallation ? "with" : "without"
    } installation: ${count} repositories`, async ({ page }) => {
      const { requests, errors } = await mockGitHub(page, {
        repositories: [repoA, repoB].slice(0, count),
      });
      await page.goto(
        `/auth/callback/github?code=fake${
          callbackInstallation ? "&installation_id=1" : ""
        }`
      );
      await expect(
        page.getByRole("button", { name: "Logged in", exact: true })
      ).toBeVisible();
      await expect
        .poll(() => requests.includes("/user/installations/1/repositories"))
        .toBe(true);
      if (count === 1) {
        await expect
          .poll(
            async () => (await readState(page)).remoteMetadata.remoteModifiedAt
          )
          .toBe(50);
        const state = await readState(page);
        expect(state.config.hosting).toMatchObject({
          repositoryId: "10",
          owner: "owner-a",
          repositoryName: "repo-a",
          targetBranch: "main",
          branchIsValid: true,
          accessToken: "test-token",
        });
        expect(state.remoteConfig.hosting.accessToken).toBe("");
        expect(
          requests.filter((path) => path.endsWith("/branches/main"))
        ).not.toHaveLength(0);
      } else {
        await expect
          .poll(async () => (await readState(page)).config.hosting.targetBranch)
          .toBe("");
        expect(requests.filter((path) => path.startsWith("/repos/"))).toEqual(
          []
        );
        expect((await readState(page)).config.hosting.accessToken).toBe(
          "test-token"
        );
      }
      assertClean(requests, errors);
    });
  }
}

test("manual repository/branch selection refreshes immediately; refresh retains branch; clear stops polling", async ({
  page,
}) => {
  const { requests, errors } = await mockGitHub(page);
  await page.clock.install();
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
  await choose(page, "Repository", "owner-a/repo-a");
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.remoteModifiedAt)
    .toBe(50);
  await choose(page, "Target Branch", "release");
  await expect
    .poll(() => requests.includes("/repos/owner-a/repo-a/branches/release"))
    .toBe(true);
  await page
    .getByRole("button", { name: "Refresh repositories and branches" })
    .click();
  await expect
    .poll(
      () => requests.filter((path) => path.endsWith("/repositories")).length
    )
    .toBeGreaterThan(1);
  expect((await readState(page)).config.hosting.targetBranch).toBe("release");
  await choose(page, "Repository", "owner-b/repo-b");
  await expect
    .poll(() => requests.includes("/repos/owner-b/repo-b/branches/develop"))
    .toBe(true);
  expect((await readState(page)).config.hosting).toMatchObject({
    repositoryId: "20",
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
  const before = requests.filter((path) => path.startsWith("/repos/")).length;
  await page.clock.fastForward(60000);
  expect(requests.filter((path) => path.startsWith("/repos/")).length).toBe(
    before
  );
  assertClean(requests, errors);
});

test("installation switching clears selection and ignores late repository discovery", async ({
  page,
}) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  page.once("close", () => release());
  let delayed = false;
  const { requests, errors } = await mockGitHub(page, {
    twoInstallations: true,
    intercept: async (route) => {
      if (route.request().url().includes("/installations/1/repositories")) {
        delayed = true;
        await waiting;
        await route.fulfill({ json: { repositories: [repoA] } });
        return true;
      }
      if (route.request().url().includes("/installations/2/repositories")) {
        await route.fulfill({ json: { repositories: [repoB] } });
        return true;
      }
      return false;
    },
  });
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
  await expect.poll(() => delayed).toBe(true);
  await choose(page, "Installation", "Installation Two");
  await expect
    .poll(async () => (await readState(page)).config.hosting.repositoryId)
    .toBe("20");
  release();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.remoteModifiedAt)
    .toBe(50);
  expect((await readState(page)).config.hosting).toMatchObject({
    installationId: "2",
    repositoryId: "20",
    targetBranch: "develop",
  });
  expect(requests.some((path) => path.includes("/repos/owner-a/"))).toBe(false);
  assertClean(requests, errors);
});

test("refresh removes an inaccessible repository without borrowing an unselected branch", async ({
  page,
}) => {
  let available = [repoA, repoB];
  const { requests, errors } = await mockGitHub(page, {
    intercept: async (route) => {
      if (new URL(route.request().url()).pathname.endsWith("/repositories")) {
        await route.fulfill({ json: { repositories: available } });
        return true;
      }
      return false;
    },
  });
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
  await choose(page, "Repository", "owner-a/repo-a");
  await expect
    .poll(async () => (await readState(page)).config.hosting.branchIsValid)
    .toBe(true);
  available = [repoB, { ...repoA, id: 30, name: "repo-c" }];
  await page
    .getByRole("button", { name: "Refresh repositories and branches" })
    .click();
  await expect
    .poll(async () => (await readState(page)).config.hosting.repositoryId)
    .toBe("");
  expect((await readState(page)).config.hosting.targetBranch).toBe("");
  assertClean(requests, errors);
});

for (const replacement of ["repository", "branch", "token"] as const) {
  for (const stale401 of [false, true]) {
    test(`late ${
      stale401 ? "401" : "success"
    } from old ${replacement} cannot overwrite current baseline/authentication`, async ({
      page,
    }) => {
      let release!: () => void,
        delayed = false;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      page.once("close", () => release());
      const initial = {
        modifiedAt: 10,
        groups: [
          {
            groupId: "local",
            name: "Local draft",
            features: {},
            environments: {},
          },
        ],
        hosting: hosting(),
      };
      const { requests, errors } = await mockGitHub(page, {
        initial,
        intercept: async (route) => {
          const url = route.request().url();
          const token = route.request().headers().authorization;
          const old =
            replacement === "token"
              ? token === "Bearer test-token"
              : url.includes("/repo-a/branches/main");
          if (url.includes("/branches/") && old && !delayed) {
            delayed = true;
            await gate;
            await route.fulfill(
              stale401
                ? { status: 401, json: {} }
                : { json: { commit: { sha: "old-head" } } }
            );
            return true;
          }
          return false;
        },
      });
      await page.goto("/?logged_in");
      await expect.poll(() => delayed).toBe(true);
      await changeHosting(
        page,
        replacement === "repository"
          ? {
              repositoryId: "20",
              owner: "owner-b",
              repositoryName: "repo-b",
              targetBranch: "develop",
            }
          : replacement === "branch"
          ? { targetBranch: "release" }
          : { accessToken: "new-token" }
      );
      await expect
        .poll(
          async () => (await readState(page)).remoteMetadata.remoteModifiedAt
        )
        .toBe(50);
      const current = await readState(page);
      expect(current.config.groups).toEqual(initial.groups);
      release();
      // Wait for the old response to be consumed, including the rest of a successful read.
      await expect
        .poll(
          () =>
            requests.filter((path) =>
              path.includes(stale401 ? "/branches/" : "/git/blobs/")
            ).length
        )
        .toBeGreaterThanOrEqual(2);
      await expect
        .poll(async () => (await readState(page)).remoteConfig)
        .toEqual(current.remoteConfig);
      expect((await readState(page)).config.hosting.accessToken).toBe(
        replacement === "token" ? "new-token" : "test-token"
      );
      expect((await readState(page)).config.groups).toEqual(initial.groups);
      assertClean(requests, errors);
    });
  }
}

test("a late old tree cannot replace an existing branch's valid empty tree", async ({
  page,
}) => {
  let release!: () => void,
    delayed = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  page.once("close", () => release());
  const { requests, errors } = await mockGitHub(page, {
    initial: { modifiedAt: 10, groups: [], hosting: hosting() },
    intercept: async (route) => {
      if (route.request().url().endsWith("/git/trees/head-main")) {
        delayed = true;
        await gate;
        await route.fulfill({ json: { tree: [{ path: "README.md" }] } });
        return true;
      }
      if (route.request().url().endsWith("/git/trees/head-release")) {
        await route.fulfill({ json: { tree: [] } });
        return true;
      }
      return false;
    },
  });
  await page.goto("/?logged_in");
  await expect.poll(() => delayed).toBe(true);
  await changeHosting(page, { targetBranch: "release" });
  await expect
    .poll(() =>
      requests.includes("/repos/owner-a/repo-a/git/trees/head-release")
    )
    .toBe(true);
  release();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("absent");
  expect((await readState(page)).config.hosting.branchIsValid).toBe(true);
  await expect(initializeButton(page)).toHaveCount(0);
  await expect(publishButton(page)).toBeEnabled();
  assertClean(requests, errors);
});

test("a failed new location invalidates old metadata while preserving local drafts and credentials", async ({
  page,
}) => {
  const initial = {
    modifiedAt: 10,
    groups: [
      { groupId: "local", name: "Local draft", features: {}, environments: {} },
    ],
    hosting: hosting(),
  };
  const { requests, errors } = await mockGitHub(page, {
    initial,
    intercept: async (route) => {
      if (
        route.request().url().endsWith("/branches/release") ||
        route.request().url().endsWith("/git/trees/release")
      ) {
        await route.fulfill({ status: 403, json: { message: "Forbidden" } });
        return true;
      }
      return false;
    },
  });
  await page.goto("/?logged_in");
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.remoteModifiedAt)
    .toBe(50);
  await choose(page, "Target Branch", "release");
  await expect
    .poll(() => requests.includes("/repos/owner-a/repo-a/branches/release"))
    .toBe(true);
  await expect
    .poll(async () => (await readState(page)).remoteMetadata)
    .toMatchObject({ remoteModifiedAt: 0, remoteMergedAt: 0 });
  const state = await readState(page);
  expect(state.config.groups).toEqual(initial.groups);
  expect(state.config.hosting).toMatchObject({
    accessToken: "test-token",
    targetBranch: "release",
    repositoryId: "10",
  });
  expect(state.remoteConfig.modifiedAt).toBe(0);
  assertClean(requests, errors);
});

test("a stale saved installation is replaced by the sole accessible installation", async ({
  page,
}) => {
  const { requests, errors } = await mockGitHub(page, {
    initial: {
      modifiedAt: 10,
      groups: [],
      hosting: {
        ...hosting(),
        repositoryId: "",
        owner: "",
        repositoryName: "",
        targetBranch: "",
      },
    },
    intercept: async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/user/installations") {
        await route.fulfill({ json: { installations: [installations[1]] } });
        return true;
      }
      if (path.includes("/installations/1/repositories")) {
        await route.fulfill({ status: 404, json: {} });
        return true;
      }
      return false;
    },
  });
  await page.goto("/?logged_in");
  await expect
    .poll(async () => (await readState(page)).config.hosting.installationId)
    .toBe("2");
  await expect
    .poll(() => requests.includes("/user/installations/2/repositories"))
    .toBe(true);
  await expect(
    page.getByRole("button", { name: "Installed", exact: true })
  ).toBeVisible();
  assertClean(requests, errors);
});

test("repository discovery follows pagination and preserves a selected later-page repository", async ({
  page,
}) => {
  let secondPage = false;
  const { requests, errors } = await mockGitHub(page, {
    initial: {
      modifiedAt: 10,
      groups: [],
      hosting: {
        ...hosting(),
        repositoryId: "20",
        owner: "owner-b",
        repositoryName: "repo-b",
        targetBranch: "release",
      },
    },
    intercept: async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/repositories")) {
        secondPage = url.searchParams.get("page") === "2" || secondPage;
        await route.fulfill(
          url.searchParams.get("page") === "2"
            ? { json: { repositories: [repoB] } }
            : {
                json: { repositories: [repoA] },
                headers: {
                  Link: `<https://api.github.com${url.pathname}?page=2>; rel="next"`,
                  "Access-Control-Expose-Headers": "Link",
                },
              }
        );
        return true;
      }
      return false;
    },
  });
  await page.goto("/?logged_in");
  await expect.poll(() => secondPage).toBe(true);
  await expect(
    page.getByRole("textbox", { name: "Repository", exact: true })
  ).toHaveValue("owner-b/repo-b");
  expect((await readState(page)).config.hosting).toMatchObject({
    repositoryId: "20",
    targetBranch: "release",
  });
  assertClean(requests, errors);
});

test("failed refresh preserves discovered options and a second refresh retries the read", async ({
  page,
}) => {
  let failing = false;
  const { requests, errors } = await mockGitHub(page, {
    initial: { modifiedAt: 10, groups: [], hosting: hosting() },
    intercept: async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (
        failing &&
        (path.endsWith("/repositories") ||
          path.endsWith("/git/trees/head-main"))
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
  ).toHaveValue("owner-a/repo-a");
  await expect
    .poll(async () => (await readState(page)).config.hosting.branchIsValid)
    .toBe(true);
  failing = true;
  await page
    .getByRole("button", { name: "Refresh repositories and branches" })
    .click();
  await expect(
    page.getByText("Could not load repositories. Refresh to try again.")
  ).toBeVisible();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("error");
  await expect(initializeButton(page)).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Repository", exact: true })
  ).toHaveValue("owner-a/repo-a");
  expect((await readState(page)).config.hosting.accessToken).toBe("test-token");
  await expect(page.getByText("sensitive server details")).toHaveCount(0);
  failing = false;
  await page
    .getByRole("button", { name: "Refresh repositories and branches" })
    .click();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("ready");
  assertClean(requests, errors);
});

test("a failed new-context read blocks Publish while a verified absent config permits first publication", async ({
  page,
}) => {
  let absent = false;
  const initial = {
    modifiedAt: 10,
    groups: [
      { groupId: "local", name: "Draft", features: {}, environments: {} },
    ],
    hosting: { ...hosting(), branchIsValid: true },
  };
  const { requests, errors } = await mockGitHub(page, {
    initial,
    intercept: async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/branches/release") && !absent) {
        await route.fulfill({ status: 500, json: {} });
        return true;
      }
      if (absent && path.endsWith("/git/trees/head-first")) {
        await route.fulfill({ json: { tree: [{ path: "README.md" }] } });
        return true;
      }
      if (absent && path.endsWith("/branches")) {
        await route.fulfill({
          json: [{ name: "main" }, { name: "release" }, { name: "first" }],
        });
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

test("a fresh repository naming main pauses reads and initializes into an absent baseline", async ({
  page,
}) => {
  const initial = {
    ...localDraft(),
    hosting: { provider: "", providerType: "" },
  };
  const { requests, errors, operations, writes } = await mockEmptyGitHub(page, {
    initial,
  });
  await page.clock.install();
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
  await expectInitializationRequired(page);
  const state = await readState(page);
  expect(state.config.groups).toEqual(initial.groups);
  expect(state.config.hosting).toMatchObject({
    accessToken: "test-token",
    installationId: "1",
    repositoryId: "10",
    owner: "owner-a",
    repositoryName: "repo-a",
    targetBranch: "main",
    branchIsValid: false,
  });
  expect(state.remoteConfig.groups).toEqual([]);
  expect(state.remoteMetadata).toMatchObject({
    remoteModifiedAt: 0,
    remoteMergedAt: 0,
  });
  expect(requests.filter((path) => path.includes("/branches/"))).toEqual([]);
  expect(requests.filter((path) => path.includes("/git/trees/"))).toEqual([
    "/repos/owner-a/repo-a/git/trees/main",
  ]);
  expect(requests.filter((path) => path.includes("/git/blobs/"))).toEqual([]);
  expect(writes).toEqual([]);
  const before = [...operations];
  await page.clock.fastForward(120000);
  expect(operations).toEqual(before);
  await expectInitializationRequired(page);
  await expect(
    page.getByText(/Could not read|Could not fetch|Could not validate/)
  ).toHaveCount(0);

  await initializeButton(page).click();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("absent");
  const initialized = await readState(page);
  expect(initialized.config.groups).toEqual(initial.groups);
  expect(initialized.remoteConfig.groups).toEqual([]);
  expect(initialized.remoteConfig.hosting.accessToken).toBe("");
  expect(initialized.config.hosting.branchIsValid).toBe(true);
  expect(initialized.validationSuccess).toBe(true);
  await expect(publishButton(page)).toBeEnabled();
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    path: "/repos/owner-a/repo-a/contents/README.md",
    authorization: "Bearer test-token",
    payload: { branch: "main", message: "chore: initialize Vexilla" },
  });
  expect(writes[0].payload.sha).toBeUndefined();
  expect(Buffer.from(writes[0].payload.content, "base64").toString()).toContain(
    "Vexilla"
  );
  const writeIndex = operations.indexOf(
    "PUT /repos/owner-a/repo-a/contents/README.md"
  );
  const followup = operations.slice(writeIndex + 1);
  expect(
    followup.indexOf("GET /repos/owner-a/repo-a/branches")
  ).toBeGreaterThanOrEqual(0);
  expect(
    followup.indexOf("GET /repos/owner-a/repo-a/branches/main")
  ).toBeGreaterThan(followup.indexOf("GET /repos/owner-a/repo-a/branches"));
  expect(
    followup.indexOf("GET /repos/owner-a/repo-a/git/trees/head-main")
  ).toBeGreaterThan(
    followup.indexOf("GET /repos/owner-a/repo-a/branches/main")
  );
  expect(
    requests.filter((path) => path.includes("/branches/main"))
  ).toHaveLength(1);
  expect(requests.filter((path) => path.includes("/git/blobs/"))).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("remoteMetadata"))
  ).not.toContain("test-token");
  assertClean(requests, errors);
});

test("initialization prevents duplicate writes and waits for the acknowledged write's config read", async ({
  page,
}) => {
  const write = deferred(page);
  const read = deferred(page);
  let verifying = false;
  const { requests, errors, operations, writes } = await mockEmptyGitHub(page, {
    intercept: async (route, repository) => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() === "PUT") {
        await write.waiting;
        repository.initialized = true;
        await route.fulfill({
          status: 201,
          json: { content: { sha: "readme" } },
        });
        return true;
      }
      if (repository.initialized && path.includes("/git/trees/head-")) {
        verifying = true;
        await read.waiting;
      }
      return false;
    },
  });
  await page.clock.install();
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
  await expectInitializationRequired(page);
  // Invoke twice in the same browser task, before React has rendered a disabled button.
  await initializeButton(page).evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => writes.length).toBe(1);
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("initializing");
  await expect(
    page.getByRole("button", { name: "Initializing…", exact: true })
  ).toBeDisabled();
  await expect(publishButton(page)).toBeDisabled();
  const before = [...operations];
  await page.clock.fastForward(90000);
  expect(operations).toEqual(before);
  write.release();
  await expect.poll(() => verifying).toBe(true);
  expect((await readState(page)).config.hosting.branchIsValid).toBe(false);
  await expect(publishButton(page)).toBeDisabled();
  read.release();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("absent");
  await expect(publishButton(page)).toBeEnabled();
  expect(writes).toHaveLength(1);
  assertClean(requests, errors);
});

test("a failed initialization rediscovers emptiness before allowing an explicit retry", async ({
  page,
}) => {
  let attempts = 0;
  const initial = localDraft();
  const { requests, errors, writes, operations } = await mockEmptyGitHub(page, {
    initial,
    intercept: async (route) => {
      if (route.request().method() === "PUT" && ++attempts === 1) {
        await route.fulfill({
          status: 500,
          json: { message: "sensitive initialization details" },
        });
        return true;
      }
      return false;
    },
  });
  await page.goto("/?logged_in");
  await expectInitializationRequired(page);
  await initializeButton(page).click();
  await expect
    .poll(
      () => requests.filter((path) => path.endsWith("/git/trees/main")).length
    )
    .toBe(2);
  await expectInitializationRequired(page);
  expect(writes).toHaveLength(1);
  await expect(
    page.getByText(/Initialization was not confirmed/)
  ).toBeVisible();
  await expect(page.getByText("sensitive initialization details")).toHaveCount(
    0
  );
  expect(
    operations.slice(
      operations.indexOf("PUT /repos/owner-a/repo-a/contents/README.md") + 1
    )
  ).toContain("GET /repos/owner-a/repo-a/branches");
  expect((await readState(page)).config.groups).toEqual(initial.groups);
  await initializeButton(page).click();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("absent");
  expect(writes).toHaveLength(2);
  assertClean(requests, errors);
});

for (const failure of ["network", "conflict"] as const) {
  test(`an initialization ${failure} rechecks an externally created branch without another write`, async ({
    page,
  }) => {
    const initial = localDraft();
    const { requests, errors, writes } = await mockEmptyGitHub(page, {
      initial,
      intercept: async (route, repository) => {
        if (route.request().method() !== "PUT") {
          return false;
        }
        repository.initialized = true;
        if (failure === "conflict") {
          repository.remoteDocument = baseline("Externally initialized");
        }
        if (failure === "network") {
          await route.abort("failed");
        } else {
          await route.fulfill({
            status: 422,
            json: { message: "README already exists" },
          });
        }
        return true;
      },
    });
    await page.goto("/?logged_in");
    await expectInitializationRequired(page);
    await initializeButton(page).click();
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.status)
      .toBe(failure === "conflict" ? "ready" : "absent");
    expect(writes).toHaveLength(1);
    expect(writes[0].payload.sha).toBeUndefined();
    expect((await readState(page)).config.groups).toEqual(initial.groups);
    expect((await readState(page)).config.hosting.accessToken).toBe(
      "test-token"
    );
    if (failure === "conflict") {
      expect((await readState(page)).remoteConfig.groups[0].name).toBe(
        "Externally initialized"
      );
    } else {
      await expect(publishButton(page)).toBeEnabled();
    }
    await expect(initializeButton(page)).toHaveCount(0);
    assertClean(requests, errors);
  });
}

test("post-write verification failure offers a read retry without a repeated initialization", async ({
  page,
}) => {
  let failing = true;
  const { requests, errors, writes } = await mockEmptyGitHub(page, {
    intercept: async (route, repository) => {
      const path = new URL(route.request().url()).pathname;
      if (repository.initialized && failing && path.endsWith("/branches")) {
        await route.fulfill({
          status: 503,
          json: { message: "sensitive verification details" },
        });
        return true;
      }
      return false;
    },
  });
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
  await expectInitializationRequired(page);
  await initializeButton(page).click();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("error");
  await expect(publishButton(page)).toBeDisabled();
  await expect(initializeButton(page)).toHaveCount(0);
  await expect(page.getByText("sensitive verification details")).toHaveCount(0);
  expect(writes).toHaveLength(1);
  failing = false;
  await page
    .getByRole("button", { name: "Retry repository read", exact: true })
    .first()
    .click();
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("absent");
  await expect(publishButton(page)).toBeEnabled();
  expect(writes).toHaveLength(1);
  assertClean(requests, errors);
});

test("Refresh discovers external initialization and preserves an explicit initial branch and drafts", async ({
  page,
}) => {
  const initial = {
    ...localDraft(),
    hosting: { ...hosting(), targetBranch: "release" },
  };
  const { requests, errors, writes, repository } = await mockEmptyGitHub(page, {
    initial,
    targetBranch: "release",
  });
  await page.goto("/?logged_in");
  await expectInitializationRequired(page);
  expect((await readState(page)).config.hosting.targetBranch).toBe("release");
  repository.initialized = true;
  await refreshRepository(page);
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("absent");
  expect((await readState(page)).config.hosting.targetBranch).toBe("release");
  expect((await readState(page)).config.groups).toEqual(initial.groups);
  expect(requests).toContain("/repos/owner-a/repo-a/branches/release");
  expect(requests).not.toContain("/repos/owner-a/repo-a/branches/main");
  expect(writes).toEqual([]);
  await expect(publishButton(page)).toBeEnabled();
  assertClean(requests, errors);
});

test("reload rechecks an empty repository despite saved branch validity and a ready baseline", async ({
  page,
}) => {
  const initial = {
    ...localDraft(),
    hosting: { ...hosting(), branchIsValid: true },
  };
  const discovery = deferred(page);
  let delayed = false;
  const { requests, errors, writes } = await mockEmptyGitHub(page, {
    initial,
    intercept: async (route) => {
      if (
        !delayed &&
        new URL(route.request().url()).pathname.endsWith("/branches")
      ) {
        delayed = true;
        await discovery.waiting;
      }
      return false;
    },
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "remoteMetadata",
      JSON.stringify({
        remoteModifiedAt: 100,
        remoteMergedAt: 200,
        status: "ready",
        locationKey: JSON.stringify(["github", "10", "main", "", ""]),
      })
    );
  });
  await page.goto("/?logged_in");
  await expect.poll(() => delayed).toBe(true);
  await expect(publishButton(page)).toBeDisabled();
  await expect(initializeButton(page)).toHaveCount(0);
  expect((await readState(page)).remoteMetadata.status).toBe("loading");
  discovery.release();
  await expectInitializationRequired(page);
  await page.reload();
  await expectInitializationRequired(page);
  const state = await readState(page);
  expect(state.config.groups).toEqual(initial.groups);
  expect(state.config.hosting.branchIsValid).toBe(false);
  expect(state.remoteConfig.groups).toEqual([]);
  expect(state.remoteMetadata).toMatchObject({
    remoteModifiedAt: 0,
    remoteMergedAt: 0,
  });
  expect(requests.filter((path) => path.includes("/branches/"))).toEqual([]);
  expect(writes).toEqual([]);
  assertClean(requests, errors);
});

test("missing default-branch metadata falls back to main only for a fresh selection", async ({
  page,
}) => {
  const { requests, errors, writes } = await mockEmptyGitHub(page, {
    defaultBranch: "",
  });
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
  await expectInitializationRequired(page);
  expect((await readState(page)).config.hosting.targetBranch).toBe("main");
  expect(requests.filter((path) => path.includes("/git/trees/"))).toEqual([
    "/repos/owner-a/repo-a/git/trees/main",
  ]);
  expect(writes).toEqual([]);
  assertClean(requests, errors);
});

for (const stale401 of [false, true]) {
  test(`an obsolete same-context ${
    stale401 ? "401" : "empty probe"
  } cannot undo initialization`, async ({ page }) => {
    const old = deferred(page);
    let holdNextProbe = false;
    let delayed = false;
    const { requests, errors, writes } = await mockEmptyGitHub(page, {
      intercept: async (route) => {
        const path = new URL(route.request().url()).pathname;
        if (!holdNextProbe || !path.endsWith("/git/trees/main")) {
          return false;
        }
        holdNextProbe = false;
        delayed = true;
        await old.waiting;
        await route.fulfill(
          stale401
            ? { status: 401, json: { message: "Bad credentials" } }
            : { status: 409, json: { message: "Git Repository is empty." } }
        );
        return true;
      },
    });
    await page.goto("/auth/callback/github?code=fake&installation_id=1");
    await expectInitializationRequired(page);
    holdNextProbe = true;
    await refreshRepository(page);
    await expect.poll(() => delayed).toBe(true);
    await refreshRepository(page);
    await expectInitializationRequired(page);
    await initializeButton(page).click();
    await expect
      .poll(async () => (await readState(page)).remoteMetadata.status)
      .toBe("absent");
    const current = await readState(page);
    const response = page.waitForResponse(
      (response) =>
        response.url().endsWith("/git/trees/main") &&
        response.status() === (stale401 ? 401 : 409)
    );
    old.release();
    await (await response).finished();
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect((await readState(page)).remoteMetadata).toEqual(
      current.remoteMetadata
    );
    expect((await readState(page)).config.hosting).toMatchObject({
      accessToken: "test-token",
      branchIsValid: true,
    });
    await expect(initializeButton(page)).toHaveCount(0);
    await expect(publishButton(page)).toBeEnabled();
    expect(writes).toHaveLength(1);
    assertClean(requests, errors);
  });
}

test("an initialization finishing after a repository switch retains its destination and cannot affect the new baseline", async ({
  page,
}) => {
  const write = deferred(page);
  const { requests, errors, writes } = await mockEmptyGitHub(page, {
    initial: localDraft(),
    intercept: async (route, repository) => {
      if (new URL(route.request().url()).pathname.endsWith("/repositories")) {
        await route.fulfill({ json: { repositories: [repoA, repoB] } });
        return true;
      }
      if (route.request().method() !== "PUT") {
        return false;
      }
      await write.waiting;
      repository.initialized = true;
      await route.fulfill({
        status: 201,
        json: { content: { sha: "readme" } },
      });
      return true;
    },
  });
  await page.goto("/?logged_in");
  await expectInitializationRequired(page);
  await initializeButton(page).click();
  await expect.poll(() => writes.length).toBe(1);
  await choose(page, "Repository", "owner-b/repo-b");
  await expect
    .poll(async () => (await readState(page)).remoteMetadata.status)
    .toBe("ready");
  const current = await readState(page);
  const readsA = requests.filter((path) =>
    path.startsWith("/repos/owner-a/")
  ).length;
  const response = page.waitForResponse(
    (response) => response.request().method() === "PUT"
  );
  write.release();
  await response;
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
  expect((await readState(page)).remoteConfig).toEqual(current.remoteConfig);
  expect((await readState(page)).config.hosting).toMatchObject({
    repositoryId: "20",
    targetBranch: "develop",
  });
  expect(
    requests.filter((path) => path.startsWith("/repos/owner-a/")).length
  ).toBe(readsA);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({
    path: "/repos/owner-a/repo-a/contents/README.md",
    payload: { branch: "main" },
  });
  assertClean(requests, errors);
});

test("a fresh callback with an existing branch and no config can publish its first settings", async ({
  page,
}) => {
  const { requests, errors } = await mockGitHub(page, {
    repositories: [repoA],
    intercept: async (route) => {
      if (new URL(route.request().url()).pathname.includes("/git/trees/")) {
        await route.fulfill({ json: { tree: [{ path: "README.md" }] } });
        return true;
      }
      return false;
    },
  });
  await page.goto("/auth/callback/github?code=fake&installation_id=1");
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
