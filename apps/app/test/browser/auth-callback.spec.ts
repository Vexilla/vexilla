import { test, expect } from "@playwright/test";

test("leaving a pending OAuth callback cannot later replace hosting or redirect", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let received = false;
  let completed = false;
  await page.route("**/oauth/github", async (route) => {
    received = true;
    await gate;
    try {
      await route.fulfill({ json: { access_token: "obsolete-token" } });
    } catch {
      /* The callback correctly aborted its request. */
    }
    completed = true;
  });
  await page.goto("/auth/callback/github?code=old");
  await expect.poll(() => received).toBe(true);
  await page.goto("/");
  release();
  await expect.poll(() => completed).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { config } = await import("/src/stores/config-valtio.ts");
        return config.hosting.provider;
      })
    )
    .toBe("");
  await expect(page).toHaveURL(/\/$/);
});

test("switching providers discards credentials instead of reusing them for discovery", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "config",
      JSON.stringify({
        modifiedAt: 1,
        groups: [],
        hosting: {
          provider: "github",
          providerType: "git",
          accessToken: "github-only-secret",
          installationId: "1",
          repositoryId: "10",
          owner: "owner",
          repositoryName: "repo",
          targetBranch: "main",
          branchIsValid: true,
          shouldCreatePullRequest: false,
          branchNamePrefix: "vexilla-",
        },
      })
    )
  );
  const gitlabRequests: string[] = [];
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({ status: 500, json: {} })
  );
  await page.route("https://gitlab.com/**", (route) => {
    gitlabRequests.push(route.request().url());
    return route.fulfill({ json: [] });
  });
  await page.goto("/?logged_in");
  await page.getByRole("textbox", { name: "Select a Provider" }).click();
  await page.getByText("GitLab", { exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const { config } = await import("/src/stores/config-valtio.ts");
        return config.hosting;
      })
    )
    .toMatchObject({
      provider: "gitlab",
      accessToken: "",
      repositoryId: "",
      targetBranch: "",
      shouldCreatePullRequest: false,
    });
  expect(gitlabRequests).toEqual([]);
});
