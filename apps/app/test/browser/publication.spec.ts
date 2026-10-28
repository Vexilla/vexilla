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
    if (new URL(url).pathname.endsWith("/branches")) {
      return route.fulfill({ json: [{ name: local.hosting.targetBranch }] });
    }
    return route.fulfill({
      json: url.includes("/git/trees/")
        ? { tree: [{ path: "config.json", sha: "blob" }] }
        : url.includes("/git/blobs/")
        ? { content: Buffer.from(JSON.stringify(remote)).toString("base64") }
        : { commit: { sha: "head" } },
    });
  });
  await page.goto(
    `/groups/${encodeURIComponent(group.groupId)}/features/${encodeURIComponent(
      id
    )}`
  );
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

function scheduleSettings() {
  const { local, group } = oldSettings();
  const id = "schedule /~ 50% ?# feature";
  const environmentId = "schedule /~ 50% ?# environment";
  const environment = structuredClone(
    Object.values(group.environments)[0]
  ) as any;
  group.groupId = "schedule ~ 50% ?# group";
  group.features = {
    [id]: {
      name: "Schedule repair feature",
      featureId: id,
      featureType: "toggle",
      value: false,
      scheduleType: "",
      schedule: {
        start: Date.UTC(2026, 10, 10),
        end: Date.UTC(2026, 10, 15),
        timezone: "UTC",
        timeType: "daily",
        startTime: 9 * 60 * 60 * 1000,
        endTime: 17 * 60 * 60 * 1000,
      },
    },
  };
  environment.environmentId = environmentId;
  environment.features = {
    [id]: {
      ...structuredClone(group.features[id]),
      schedule: {
        ...group.features[id].schedule,
        start: Date.UTC(2026, 10, 11),
        end: Date.UTC(2026, 10, 16),
      },
    },
  };
  group.environments = { [environmentId]: environment };
  return { local, group, id, environmentId };
}
const pointer = (id: string) => id.replace(/~/g, "~0").replace(/\//g, "~1");
const savedGroups = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("config")!).groups);
const issueLink = (page: Page, path: string) =>
  page
    .getByText(path, { exact: true })
    .locator("..")
    .getByRole("link", { name: "Edit affected settings" });

for (const scope of ["group", "environment"] as const) {
  test(`publication opens only the ${scope} schedule repair with encoded IDs while None stays selected`, async ({
    page,
  }) => {
    const { local, group, id, environmentId } = scheduleSettings();
    const target =
      scope === "group"
        ? group.features[id]
        : group.environments[environmentId].features[id];
    target.schedule.timezone = "Invalid/Timezone";
    const before = structuredClone(local.groups);
    const writes = await openEditor(page, local);
    await expect(
      page.getByRole("textbox", { name: "Timezone", exact: true })
    ).toHaveCount(0);
    await publish(page);
    const path = `/groups/${pointer(group.groupId)}${
      scope === "environment" ? `/environments/${pointer(environmentId)}` : ""
    }/features/${pointer(id)}/schedule/timezone`;
    const sectionId =
      scope === "group" ? "group-defaults" : `environment-${environmentId}`;
    const route = `/groups/${encodeURIComponent(
      group.groupId
    )}/features/${encodeURIComponent(id)}?repair=schedule#${encodeURIComponent(
      sectionId
    )}`;
    const link = issueLink(page, path);
    await expect(link).toHaveAttribute("href", route);
    expect(writes).toHaveLength(0);
    expect(await captured(page)).toHaveLength(0);
    expect(await savedGroups(page)).toEqual(before);
    await link.click();
    await expect(page).toHaveURL(`http://127.0.0.1:5173${route}`);
    const section = page.locator("section").filter({
      has: page.getByRole("heading", {
        name:
          scope === "group"
            ? "Group defaults"
            : group.environments[environmentId].name,
        exact: true,
      }),
    });
    await expect(
      section.getByRole("textbox", { name: "Timezone", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Timezone", exact: true })
    ).toHaveCount(1);
    await expect(
      page.getByText("Edit saved schedule", { exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: "Schedule dates and times",
        exact: true,
      })
    ).toHaveCount(1);
    await expect(
      page.getByRole("radio", { name: "None", exact: true }).first()
    ).toBeChecked();
    expect(await savedGroups(page)).toEqual(before);
    await section
      .getByRole("textbox", { name: "Timezone", exact: true })
      .click();
    await page.getByRole("option", { name: "UTC", exact: true }).click();
    const expected = structuredClone(before);
    const repaired =
      scope === "group"
        ? expected[0].features[id]
        : expected[0].environments[environmentId].features[id];
    repaired.schedule.timezone = "UTC";
    expect(await savedGroups(page)).toEqual(expected);
    await publish(page);
    await expect.poll(async () => (await captured(page)).length).toBe(1);
    const files = (await captured(page))[0];
    const published = JSON.parse(
      files.find((file) => file.filePath === `${group.groupId}.json`)!.content
    );
    expect(published.features[id].scheduleType).toBe("");
    expect(
      published.environments[environmentId].features[id].scheduleType
    ).toBe("");
    expect(published.features[id].schedule).toEqual(
      expected[0].features[id].schedule
    );
    expect(published.environments[environmentId].features[id].schedule).toEqual(
      expected[0].environments[environmentId].features[id].schedule
    );
  });
}

test("publication marks a missing schedule itself as repairable without initializing it on entry", async ({
  page,
}) => {
  const { local, group, id } = scheduleSettings();
  delete group.features[id].schedule;
  const before = structuredClone(local.groups);
  await openEditor(page, local);
  await publish(page);
  const link = issueLink(
    page,
    `/groups/${pointer(group.groupId)}/features/${pointer(id)}/schedule`
  );
  await expect(link).toHaveAttribute(
    "href",
    /\?repair=schedule#group-defaults$/
  );
  await link.click();
  await expect(
    page
      .locator("#group-defaults")
      .getByRole("textbox", { name: "Timezone", exact: true })
  ).toBeVisible();
  expect(await savedGroups(page)).toEqual(before);
});

for (const field of [
  "seed",
  "scheduleType",
  "featureId",
  "environmentId",
] as const) {
  test(`publication ${field} links stay ordinary when IDs contain schedule text`, async ({
    page,
  }) => {
    const { local, group, id, environmentId } = scheduleSettings();
    if (field === "seed") {
      group.features[id].featureType = "gradual";
      group.features[id].value = 1;
      const feature = group.environments[environmentId].features[id];
      feature.featureType = "gradual";
      feature.value = 1;
      feature.seed = 0.5;
    } else if (field === "environmentId") {
      group.environments[environmentId].environmentId = "legacy-placeholder";
    } else {
      group.features[id][field] =
        field === "scheduleType" ? "off" : "legacy-placeholder";
    }
    const before = structuredClone(local.groups);
    await openEditor(page, local);
    await publish(page);
    const path = `/groups/${pointer(group.groupId)}/${
      field === "environmentId"
        ? `environments/${pointer(environmentId)}/environmentId`
        : `features/${pointer(id)}/${field}`
    }`;
    const link = issueLink(page, path);
    await expect(link).not.toHaveAttribute("href", /repair=schedule/);
    await link.click();
    await expect(
      page.getByRole("heading", {
        name: field === "environmentId" ? "Edit Environment" : "Edit Feature",
        exact: true,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "Timezone", exact: true })
    ).toHaveCount(0);
    await expect(
      page.getByText("Edit saved schedule", { exact: true })
    ).toHaveCount(0);
    expect(await savedGroups(page)).toEqual(before);
  });
}
