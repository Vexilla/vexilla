import { test, expect, Page } from "@playwright/test";

async function readState(page: Page) {
  return page.evaluate(async () => {
    const store = await import("/src/stores/config-valtio.ts");
    const { gitReadContextKey, gitLocationKey } = await import(
      "/src/utils/fetcher.ts"
    );
    return JSON.parse(
      JSON.stringify({
        groups: store.config.groups,
        baseline: store.remoteConfig,
        metadata: store.remoteMetadata,
        authority: store.remoteReadAuthority,
        ready: store.isRemoteBaselineReady(),
        readContext: gitReadContextKey(store.config.hosting),
        location: gitLocationKey(store.config.hosting),
      })
    );
  });
}

async function openEmptyGroups(page: Page) {
  const initial = {
    modifiedAt: 1,
    groups: [],
    hosting: {
      provider: "github",
      providerType: "git",
      accessToken: "test-token",
      installationId: "1",
      repositoryId: "10",
      owner: "owner",
      repositoryName: "repo",
      targetBranch: "main",
      branchIsValid: true,
      shouldCreatePullRequest: false,
      branchNamePrefix: "vexilla-",
    },
  };
  await page.addInitScript((initial) => {
    if (!localStorage.getItem("config")) {
      localStorage.setItem("config", JSON.stringify(initial));
    }
  }, initial);
  const reads: string[] = [];
  await page.route("https://api.github.com/**", (route) => {
    expect(route.request().method()).toBe("GET");
    const url = route.request().url();
    reads.push(url);
    return route.fulfill({
      json: new URL(url).pathname.endsWith("/branches")
        ? [{ name: "main" }]
        : url.includes("/git/trees/")
        ? { tree: [{ path: "config.json", sha: "blob" }] }
        : url.includes("/git/blobs/")
        ? { content: Buffer.from(JSON.stringify(initial)).toString("base64") }
        : { commit: { sha: "head" } },
    });
  });
  await page.goto("/");
  await expect.poll(async () => (await readState(page)).ready).toBe(true);
  await page.waitForLoadState("networkidle");
  return reads;
}

const navigation = (page: Page) => page.locator(".appshell-navbar");
const groupCard = (page: Page) =>
  navigation(page)
    .locator("div.rounded.bg-slate-50")
    .filter({
      has: page.getByText("Feature Groups", { exact: true }),
    });
async function expectGroups(page: Page, names: string[]) {
  const card = groupCard(page);
  await expect(card.locator("li")).toHaveCount(names.length);
  await expect(card.locator(".rounded-full")).toHaveText(String(names.length));
  for (const name of names) {
    await expect(card.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(card.getByText("No Groups found.", { exact: true })).toHaveCount(
    names.length ? 0 : 1
  );
}
async function addGroup(page: Page) {
  await groupCard(page)
    .getByRole("button", { name: "New", exact: true })
    .click();
}
async function deleteGroup(page: Page, name: string) {
  const row = groupCard(page)
    .locator("li")
    .filter({
      has: page.getByRole("link", { name, exact: true }),
    });
  await row.getByRole("button").last().click();
  await page
    .getByRole("dialog", { name: `Delete ${name}?` })
    .getByRole("button", { name: "Delete", exact: true })
    .click();
}

test("adding the first group and deleting the last update rows, count, and empty state immediately", async ({
  page,
}) => {
  const reads = await openEmptyGroups(page);
  const before = await readState(page);
  const readCount = reads.length;
  await expectGroups(page, []);
  await addGroup(page);
  await expectGroups(page, ["Group 1"]);
  const group = (await readState(page)).groups[0];
  await expect(
    navigation(page).getByRole("link", { name: "Group 1", exact: true })
  ).toHaveAttribute("href", `/groups/${group.groupId}`);
  await deleteGroup(page, "Group 1");
  await expectGroups(page, []);
  expect(await readState(page)).toEqual(before);
  expect(reads).toHaveLength(readCount);
  await page.reload();
  await expectGroups(page, []);
});

test("rename and add/delete/add use the current collection and persist without restarting remote reads", async ({
  page,
}) => {
  const reads = await openEmptyGroups(page);
  const before = await readState(page);
  const readCount = reads.length;
  await addGroup(page);
  await expectGroups(page, ["Group 1"]);
  await addGroup(page);
  await expectGroups(page, ["Group 1", "Group 2"]);
  const [first, second] = (await readState(page)).groups;
  await deleteGroup(page, "Group 1");
  await expectGroups(page, ["Group 2"]);
  await addGroup(page);
  await expect(groupCard(page).locator("li")).toHaveCount(2);
  expect(
    (await readState(page)).groups.map((group: any) => group.name)
  ).toEqual(["Group 2", "Group 2"]);
  await groupCard(page)
    .getByRole("link", { name: "Group 2", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Renamed");
  await expectGroups(page, ["Renamed", "Group 2"]);
  await expect(
    navigation(page).getByRole("link", { name: "Renamed", exact: true })
  ).toHaveAttribute("href", `/groups/${second.groupId}`);
  const after = await readState(page);
  expect(after.groups.map((group: any) => group.groupId)).not.toContain(
    first.groupId
  );
  expect(after.groups[0].groupId).toBe(second.groupId);
  const { groups: _beforeGroups, ...beforeReadState } = before;
  const { groups: _afterGroups, ...afterReadState } = after;
  expect(afterReadState).toEqual(beforeReadState);
  expect(reads).toHaveLength(readCount);
  await page.reload();
  await expectGroups(page, ["Renamed", "Group 2"]);
  expect((await readState(page)).groups).toEqual(after.groups);
});
