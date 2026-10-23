import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const stored = JSON.parse(
  readFileSync(
    new URL(
      "../../../../packages/test-server/fixtures/config.json",
      import.meta.url
    ),
    "utf8"
  )
);
function oldSettings() {
  const local = structuredClone(stored);
  local.groups = local.groups.slice(0, 1);
  // Isolate one legacy feature so each failed field has a concrete repair.
  const group = local.groups[0],
    id = Object.keys(group.features)[0];
  group.features = { [id]: group.features[id] };
  for (const env of Object.values(group.environments) as any[]) {
    env.features = { [id]: env.features[id] };
  }
  local.hosting = {
    ...local.hosting,
    accessToken: "test-token",
    branchIsValid: true,
    targetBranch: "main",
  };
  local.modifiedAt = 10;
  return { local, group, id };
}
async function openEditor(page: Page, local: any) {
  const group = local.groups[0],
    id = Object.keys(group.features)[0];
  const remote = structuredClone(local);
  remote.modifiedAt = 1;
  remote.groups[0].name = "Old name";
  await page.addInitScript(
    ({ local, remote }) => {
      localStorage.setItem("config", JSON.stringify(local));
      localStorage.setItem("remoteConfig", JSON.stringify(remote));
      localStorage.setItem(
        "remoteMetadata",
        JSON.stringify({ remoteModifiedAt: 1, remoteMergedAt: 20 })
      );
    },
    { local, remote }
  );
  const writes: any[] = [];
  await page.route("https://api.github.com/**", (route) => {
    if (route.request().method() !== "GET") {
      writes.push(route.request().url());
      return route.fulfill({ json: { sha: "new", tree: [] } });
    }
    const url = route.request().url();
    return route.fulfill({
      json: url.includes("/git/trees/")
        ? { tree: [{ path: "config.json", sha: "blob" }] }
        : url.includes("/git/blobs/")
        ? { content: Buffer.from(JSON.stringify(remote)).toString("base64") }
        : { commit: { sha: "head" } },
    });
  });
  await page.goto(`/groups/${group.groupId}/features/${id}`);
  await page.evaluate(async () => {
    const { GitHubFetcher } = await import(
      "/src/components/app/forms/GithubForm.fetchers.ts"
    );
    (window as any).__files = [];
    GitHubFetcher.prototype.publish = async (_branch: string, files: any[]) => {
      (window as any).__files.push(files);
    };
  });
  // Persisted timestamps no longer authorize an unverified baseline. Review
  // the fetched difference explicitly, keeping the local draft in this test.
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("button", { name: "Reject All", exact: true }).click();
  await page
    .getByRole("button", { name: "Merge Remote Changes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true })
  ).toBeEnabled();
  return writes;
}
async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Accept All", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish Local Changes", exact: true })
    .click();
}
const captured = (page: Page) =>
  page.evaluate(
    () => (window as any).__files as { filePath: string; content: string }[][]
  );

test("old settings remain intact; explicit group seed repair enables one scrubbed publication", async ({
  page,
}) => {
  const { local, group, id } = oldSettings();
  const writes = await openEditor(page, local);
  await publish(page);
  await expect(
    page.getByRole("dialog", { name: "Repair settings before publishing" })
  ).toBeVisible();
  expect(writes).toHaveLength(0);
  expect(await captured(page)).toHaveLength(0);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("config")!)
  );
  expect(saved.groups[0].features[id].seed).toBeUndefined();
  expect(saved.groups).toEqual(local.groups);
  await page
    .getByRole("link", { name: "Edit affected settings" })
    .first()
    .click();
  await page
    .locator("#group-defaults")
    .getByLabel("Seed", { exact: true })
    .fill("1.1");
  await publish(page);
  await expect(
    page.getByRole("dialog", { name: "Repair settings before publishing" })
  ).toBeVisible();
  expect(await captured(page)).toHaveLength(0);
  expect(writes).toHaveLength(0);
  await page
    .getByRole("link", { name: "Edit affected settings" })
    .first()
    .click();
  await page
    .locator("#group-defaults")
    .getByLabel("Seed", { exact: true })
    .fill("0.5");
  await page
    .locator("#group-defaults")
    .getByLabel("Threshold", { exact: true })
    .fill("1");
  await publish(page);
  await expect.poll(async () => (await captured(page)).length).toBe(1);
  const files = (await captured(page))[0];
  const publicGroup = JSON.parse(
    files.find((f) => f.filePath === `${group.groupId}.json`)!.content
  );
  expect(publicGroup.features[id].seed).toBe(0.5);
  expect(
    JSON.parse(files.find((f) => f.filePath === "config.json")!.content).hosting
      .accessToken
  ).toBe("");
});

test("legacy placeholder IDs stay unchanged until explicit feature and environment repairs", async ({
  page,
}) => {
  const { local, group, id } = oldSettings();
  group.features[id].seed = 0.5;
  group.features[id].value = 1;
  const environmentId = Object.keys(group.environments)[0];
  const environment = group.environments[environmentId];
  environment.environmentId = "legacy-placeholder";
  environment.features[id].featureId = "legacy-placeholder";
  const before = structuredClone(local.groups);
  const writes = await openEditor(page, local);
  await publish(page);
  await expect(
    page.getByRole("dialog", { name: "Repair settings before publishing" })
  ).toBeVisible();
  expect(writes).toHaveLength(0);
  expect(await captured(page)).toHaveLength(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("config")!).groups
    )
  ).toEqual(before);
  await page
    .getByText(
      `/groups/${group.groupId}/environments/${environmentId}/features/${id}/featureId`,
      { exact: true }
    )
    .locator("..")
    .getByRole("link", { name: "Edit affected settings" })
    .click();
  const section = page.locator(`#environment-${environmentId}`);
  await section
    .getByRole("button", { name: `Use feature ID ${id}`, exact: true })
    .click();
  await section
    .getByRole("button", {
      name: `Use environment ID ${environmentId}`,
      exact: true,
    })
    .click();
  await publish(page);
  await expect.poll(async () => (await captured(page)).length).toBe(1);
  const files = (await captured(page))[0];
  const published = JSON.parse(
    files.find((f) => f.filePath === `${group.groupId}.json`)!.content
  );
  expect(published.environments[environmentId].environmentId).toBe(
    environmentId
  );
  expect(published.environments[environmentId].features[id].featureId).toBe(id);
  expect(published.environments[environmentId].features[id].seed).toBe(
    environment.features[id].seed
  );
});
