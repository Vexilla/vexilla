import { test, expect, type Locator, type Page } from "@playwright/test";
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
const featureId = "schedule-feature";
const environmentIds = ["development", "production"];
const schedule = (offset = 0) => ({
  start: Date.UTC(2026, 10, 10 + offset),
  end: Date.UTC(2026, 10, 15 + offset),
  timezone: "UTC",
  timeType: "daily",
  startTime: (9 + offset) * 60 * 60 * 1000,
  endTime: (17 + offset) * 60 * 60 * 1000,
});
function settings() {
  const local = structuredClone(stored);
  const group = local.groups[0];
  local.groups = [group];
  group.name = "Schedule group";
  group.features = {
    [featureId]: {
      name: "Schedule feature",
      featureId,
      featureType: "toggle",
      value: true,
      scheduleType: "",
      schedule: schedule(),
    },
  };
  const template = Object.values(group.environments)[0];
  group.environments = Object.fromEntries(
    environmentIds.map((id, index) => {
      const environment = structuredClone(template) as any;
      environment.environmentId = id;
      environment.name = id;
      environment.features = {
        [featureId]: {
          ...structuredClone(group.features[featureId]),
          // Loading and revealing the editor must preserve legacy differences.
          scheduleType: index ? "global" : "environment",
          schedule: schedule(index + 1),
        },
      };
      return [id, environment];
    })
  );
  local.hosting = {
    ...local.hosting,
    accessToken: "test-token",
    branchIsValid: true,
    targetBranch: "main",
    shouldCreatePullRequest: false,
  };
  local.modifiedAt = 10;
  return { local, group };
}

async function openEditor(page: Page, local: any, path?: string) {
  const remote = structuredClone(local);
  remote.modifiedAt = 1;
  remote.groups[0].name = "Previous group name";
  await page.addInitScript(
    ({ local, remote }) => {
      if (!localStorage.getItem("config")) {
        localStorage.setItem("config", JSON.stringify(local));
        localStorage.setItem("remoteConfig", JSON.stringify(remote));
      }
    },
    { local, remote }
  );
  await page.route("https://api.github.com/**", (route) => {
    const url = route.request().url();
    if (route.request().method() !== "GET") {
      throw new Error(`Unexpected provider write: ${url}`);
    }
    if (new URL(url).pathname.endsWith("/branches")) {
      return route.fulfill({ json: [{ name: "main" }] });
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
    path ?? `/groups/${local.groups[0].groupId}/features/${featureId}`
  );
  await page.evaluate(async () => {
    const { GitHubFetcher } = await import(
      "/src/components/app/forms/GithubForm.fetchers.ts"
    );
    (window as any).__schedulePublications = [];
    GitHubFetcher.prototype.publish = async (_branch: string, files: any[]) => {
      (window as any).__schedulePublications.push(files);
    };
  });
  // Finish initial remote loading before exercising any local UI interaction.
  await page.getByRole("button", { name: "View", exact: true }).click();
  await page.getByRole("button", { name: "Reject All", exact: true }).click();
  await page
    .getByRole("button", { name: "Merge Remote Changes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish", exact: true })
  ).toBeEnabled();
}
const savedGroup = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("config")!).groups[0]);
const savedSchedules = async (page: Page) => {
  const group = await savedGroup(page);
  return [
    group.features[featureId].schedule,
    ...environmentIds.map(
      (id) => group.environments[id].features[featureId].schedule
    ),
  ];
};
const selectMode = (page: Page, name: string) =>
  page
    .getByRole("radiogroup", { name: "Schedule Type", exact: true })
    .getByRole("radio", { name, exact: true })
    .check();
const groupSection = (page: Page) => page.locator("#group-defaults");
const environmentSection = (page: Page, index: number) =>
  page.locator(`#environment-${environmentIds[index]}`);
async function expectNoScheduleControls(page: Page) {
  await expect(
    page.getByText("Edit saved schedule", { exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Schedule dates and times", exact: true })
  ).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(0);
  await expect(page.getByLabel("Start Time", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("End Time", { exact: true })).toHaveCount(0);
}
async function navigateWithinEditor(page: Page, suffix: string) {
  await page.evaluate((suffix) => {
    window.history.pushState({}, "", `${window.location.pathname}${suffix}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, suffix);
}
async function chooseTimezone(page: Page, section: Locator, timezone: string) {
  await section.getByRole("textbox", { name: "Timezone", exact: true }).click();
  await page.getByRole("option", { name: timezone, exact: true }).click();
}
async function publish(page: Page) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("button", { name: "Accept All", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish Local Changes", exact: true })
    .click();
}

test("a new unscheduled feature shows only its selected scope and resets saved-schedule disclosures", async ({
  page,
}) => {
  const { local, group } = settings();
  group.features = {};
  for (const environment of Object.values(group.environments) as any[]) {
    environment.features = {};
  }
  await openEditor(page, local, `/groups/${group.groupId}`);
  const featureCard = page
    .getByText("Features", { exact: true })
    .locator("../../..");
  await featureCard.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("link", { name: "Feature 1", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "None", exact: true })
  ).toBeChecked();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(0);
  await expect(
    page.getByRole("switch", { name: "Enabled", exact: true })
  ).toHaveCount(3);
  await expectNoScheduleControls(page);
  await selectMode(page, "Global");
  const disclosure = environmentSection(page, 0).locator("summary");
  await disclosure.focus();
  await disclosure.press("Enter");
  await expect(
    environmentSection(page, 0).getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(2);
  await expect(
    groupSection(page).getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await selectMode(page, "Per Environment");
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(2);
  await expect(
    groupSection(page).getByRole("textbox", { name: "Timezone" })
  ).toHaveCount(0);
  await groupSection(page).locator("summary").click();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(3);
  await selectMode(page, "None");
  await expectNoScheduleControls(page);
  await selectMode(page, "Global");
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(1);
  await expect(
    environmentSection(page, 0).locator("details")
  ).not.toHaveAttribute("open");
  await selectMode(page, "None");
  await expectNoScheduleControls(page);
  const saved = await savedGroup(page);
  const created = Object.values(saved.features)[0] as any;
  expect(created.scheduleType).toBe("");
  expect(created.schedule).toEqual({
    start: 0,
    end: 0,
    timezone: "UTC",
    timeType: "none",
    startTime: 0,
    endTime: 0,
  });
});

for (const scheduleType of [
  undefined,
  null,
  "",
  "none",
  "off",
  "unsupported",
]) {
  test(`ordinary editing hides all schedule UI for scheduleType ${String(
    scheduleType
  )}`, async ({ page }) => {
    const { local, group } = settings();
    if (scheduleType === undefined) {
      delete group.features[featureId].scheduleType;
    } else {
      group.features[featureId].scheduleType = scheduleType;
    }
    const before = structuredClone(group);
    await openEditor(page, local);
    await expectNoScheduleControls(page);
    await expect(
      page.getByRole("radiogroup", { name: "Schedule Type", exact: true })
    ).toBeVisible();
    await expect(
      page.getByRole("switch", { name: "Enabled", exact: true })
    ).toHaveCount(3);
    expect(await savedGroup(page)).toEqual(before);
    await groupSection(page).getByText("Enabled", { exact: true }).click();
    await expect(
      groupSection(page).getByRole("switch", { name: "Enabled" })
    ).not.toBeChecked();
    const after = await savedGroup(page);
    expect(after.features[featureId].scheduleType).toBe(scheduleType);
    expect(after.features[featureId].schedule).toEqual(
      before.features[featureId].schedule
    );
    expect(after.environments).toEqual(before.environments);
    await expectNoScheduleControls(page);
  });
}

test("Global scheduling is available when the group has no environments", async ({
  page,
}) => {
  const { local, group } = settings();
  group.environments = {};
  await openEditor(page, local);
  await expectNoScheduleControls(page);
  await selectMode(page, "Global");
  await expect(
    groupSection(page).getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(1);
  await expect(
    page.getByText("Edit saved schedule", { exact: true })
  ).toHaveCount(0);
});

test("loading, revealing, mode changes, and reload preserve all saved schedules", async ({
  page,
}) => {
  const { local, group } = settings();
  const before = structuredClone(group);
  await openEditor(page, local);
  expect(await savedGroup(page)).toEqual(before);
  const schedules = await savedSchedules(page);
  await expectNoScheduleControls(page);
  await page.reload();
  await expectNoScheduleControls(page);
  expect(await savedGroup(page)).toEqual(before);
  await selectMode(page, "Global");
  await environmentSection(page, 0).locator("summary").click();
  await expect(
    environmentSection(page, 0).getByLabel("Start Time", { exact: true })
  ).toBeVisible();
  expect(await savedSchedules(page)).toEqual(schedules);
  await selectMode(page, "Per Environment");
  expect(await savedSchedules(page)).toEqual(schedules);
  await groupSection(page).locator("summary").click();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(3);
  await selectMode(page, "None");
  await expectNoScheduleControls(page);
  expect(await savedSchedules(page)).toEqual(schedules);
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "None", exact: true })
  ).toBeChecked();
  await expectNoScheduleControls(page);
  expect(await savedSchedules(page)).toEqual(schedules);
  await selectMode(page, "Global");
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(1);
  await expect(
    groupSection(page).getByLabel("Start Time", { exact: true })
  ).toHaveValue("09:00");
  await expect(
    environmentSection(page, 0).locator("details")
  ).not.toHaveAttribute("open");
  await selectMode(page, "Per Environment");
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(2);
  await expect(
    environmentSection(page, 0).getByLabel("Start Time", { exact: true })
  ).toHaveValue("10:00");
  await expect(
    environmentSection(page, 1).getByLabel("Start Time", { exact: true })
  ).toHaveValue("11:00");
  await expect(groupSection(page).locator("details")).not.toHaveAttribute(
    "open"
  );
  expect(await savedSchedules(page)).toEqual(schedules);
});

for (const mode of ["Global", "Per Environment"]) {
  test(`date-only schedules remain visible on false toggles in ${mode} mode`, async ({
    page,
  }) => {
    const { local, group } = settings();
    group.features[featureId].scheduleType =
      mode === "Global" ? "global" : "environment";
    for (const feature of [
      group.features[featureId],
      ...Object.values(group.environments).map(
        (environment: any) => environment.features[featureId]
      ),
    ]) {
      feature.value = false;
      feature.schedule.timeType = "none";
    }
    const before = structuredClone(group);
    await openEditor(page, local);
    const active =
      mode === "Global"
        ? [groupSection(page)]
        : environmentIds.map((_, index) => environmentSection(page, index));
    for (const section of active) {
      await expect(
        section.getByRole("switch", { name: "Enabled" })
      ).not.toBeChecked();
      await expect(
        section.getByRole("textbox", { name: "Timezone" })
      ).toBeVisible();
      await expect(section.locator("table")).toBeVisible();
      await expect(
        section.getByRole("radio", { name: "None", exact: true })
      ).toBeChecked();
    }
    await expect(page.getByLabel("Start Time", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("End Time", { exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Edit saved schedule", { exact: true })
    ).toHaveCount(mode === "Global" ? 2 : 1);
    expect(await savedGroup(page)).toEqual(before);
  });
}

test("explicit global edits copy independent schedules and subsequent environment edits stay local", async ({
  page,
}) => {
  const { local } = settings();
  await openEditor(page, local);
  await selectMode(page, "Global");
  await chooseTimezone(page, groupSection(page), "America/New_York");
  const globalSchedule = { ...schedule(), timezone: "America/New_York" };
  expect(await savedSchedules(page)).toEqual([
    globalSchedule,
    globalSchedule,
    globalSchedule,
  ]);
  expect(
    await page.evaluate(async () => {
      const { config } = await import("/src/stores/config-valtio.ts");
      const group = config.groups[0];
      const schedules = [
        group.features["schedule-feature"].schedule,
        ...Object.values(group.environments).map(
          (env) => env.features["schedule-feature"].schedule
        ),
      ];
      return new Set(schedules).size;
    })
  ).toBe(3);
  await selectMode(page, "Per Environment");
  await chooseTimezone(page, environmentSection(page, 0), "Europe/London");
  await environmentSection(page, 0)
    .getByLabel("Start Time", { exact: true })
    .fill("10:15");
  const environmentSchedule = {
    ...globalSchedule,
    timezone: "Europe/London",
    startTime: (10 * 60 + 15) * 60 * 1000,
  };
  expect(await savedSchedules(page)).toEqual([
    globalSchedule,
    environmentSchedule,
    globalSchedule,
  ]);
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Per Environment", exact: true })
  ).toBeChecked();
  expect(await savedSchedules(page)).toEqual([
    globalSchedule,
    environmentSchedule,
    globalSchedule,
  ]);
});

test("publication repair reveals an inactive environment timezone and republishes while unscheduled", async ({
  page,
}) => {
  const { local, group } = settings();
  group.environments[environmentIds[0]].features[featureId].schedule.timezone =
    "Invalid/Timezone";
  const before = [
    schedule(),
    { ...schedule(1), timezone: "Invalid/Timezone" },
    schedule(2),
  ];
  await openEditor(page, local);
  await publish(page);
  await expect(
    page.getByRole("dialog", { name: "Repair settings before publishing" })
  ).toBeVisible();
  const path = `/groups/${group.groupId}/environments/${environmentIds[0]}/features/${featureId}/schedule/timezone`;
  await page
    .getByText(path, { exact: true })
    .locator("..")
    .getByRole("link", { name: "Edit affected settings" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`\\?repair=schedule#environment-${environmentIds[0]}$`)
  );
  const section = environmentSection(page, 0);
  await expect(
    section.getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(1);
  await expect(
    page.getByText("Edit saved schedule", { exact: true })
  ).toHaveCount(0);
  expect(await savedSchedules(page)).toEqual(before);
  await chooseTimezone(page, section, "UTC");
  await expect(
    page.getByRole("radio", { name: "None", exact: true }).first()
  ).toBeChecked();
  expect(await savedSchedules(page)).toEqual([
    schedule(),
    schedule(1),
    schedule(2),
  ]);
  await publish(page);
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).__schedulePublications.length)
    )
    .toBe(1);
  expect((await savedGroup(page)).features[featureId].scheduleType).toBe("");
});

test("incomplete, unrelated, and malformed repair URLs hide disabled schedules", async ({
  page,
}) => {
  const { local, group } = settings();
  // An environment section alone is insufficient when its feature is absent.
  delete group.environments[environmentIds[1]].features[featureId];
  const before = structuredClone(group);
  await openEditor(page, local);
  for (const suffix of [
    "?repair=schedule",
    "#group-defaults",
    "?repair=other#group-defaults",
    "?repair=schedule#unknown",
    "?repair=schedule#environment-missing",
    "?repair=schedule#environment-",
    `?repair=schedule#environment-${environmentIds[1]}`,
    "?repair=schedule#%",
    "?repair=schedule#%E0%A4%A",
  ]) {
    // Start with a valid open editor so each negative assertion also proves
    // that navigation clears the previous repair visibility.
    await navigateWithinEditor(page, "?repair=schedule#group-defaults");
    await expect(
      groupSection(page).getByRole("textbox", { name: "Timezone" })
    ).toBeVisible();
    await navigateWithinEditor(page, suffix);
    await expectNoScheduleControls(page);
    await expect(
      groupSection(page).getByText("Enabled", { exact: true })
    ).toBeVisible();
    expect(await savedGroup(page)).toEqual(before);
  }
});

test("repair visibility follows target, query changes, reload, and marker removal", async ({
  page,
}) => {
  const { local, group } = settings();
  const before = structuredClone(group);
  await openEditor(page, local);
  await page.evaluate(() => {
    (window as any).__scheduleScrollTargets = [];
    const scrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (...args) {
      (window as any).__scheduleScrollTargets.push(this.id);
      scrollIntoView.apply(this, args);
    };
  });
  await navigateWithinEditor(page, "?repair=schedule#group-defaults");
  await expect(
    groupSection(page).getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).__scheduleScrollTargets))
    .toContain("group-defaults");
  await navigateWithinEditor(
    page,
    `?repair=schedule#environment-${environmentIds[0]}`
  );
  await expect(
    environmentSection(page, 0).getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await expect(
    groupSection(page).getByRole("textbox", { name: "Timezone" })
  ).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => (window as any).__scheduleScrollTargets))
    .toContain(`environment-${environmentIds[0]}`);
  // Change only the query, keeping the same fragment, then open repair again.
  await navigateWithinEditor(
    page,
    `?repair=other#environment-${environmentIds[0]}`
  );
  await expectNoScheduleControls(page);
  await page.evaluate(() => {
    (window as any).__scheduleScrollTargets = [];
  });
  await navigateWithinEditor(
    page,
    `?repair=schedule#environment-${environmentIds[0]}`
  );
  await expect(
    environmentSection(page, 0).getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).__scheduleScrollTargets))
    .toContain(`environment-${environmentIds[0]}`);
  expect(await savedGroup(page)).toEqual(before);
  await page.reload();
  await expect(
    environmentSection(page, 0).getByRole("textbox", { name: "Timezone" })
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Timezone" })).toHaveCount(1);
  expect(await savedGroup(page)).toEqual(before);
  await navigateWithinEditor(page, `#environment-${environmentIds[0]}`);
  await expectNoScheduleControls(page);
  expect(await savedGroup(page)).toEqual(before);
});

for (const mode of ["Per Environment", "Global"]) {
  test(`inactive schedule repairs in ${mode} mode only change the selected section`, async ({
    page,
  }) => {
    const { local, group } = settings();
    group.features[featureId].scheduleType =
      mode === "Global" ? "global" : "environment";
    const target =
      mode === "Global"
        ? group.environments[environmentIds[0]].features[featureId]
        : group.features[featureId];
    target.schedule.timezone = "Invalid/Timezone";
    const before = [
      group.features[featureId].schedule,
      ...environmentIds.map(
        (id) => group.environments[id].features[featureId].schedule
      ),
    ];
    await openEditor(page, local);
    const section =
      mode === "Global" ? environmentSection(page, 0) : groupSection(page);
    await expect(
      section.getByRole("textbox", { name: "Timezone" })
    ).toHaveCount(0);
    await section.locator("summary").click();
    await expect(
      section.getByRole("textbox", { name: "Timezone" })
    ).toBeVisible();
    expect(await savedSchedules(page)).toEqual(before);
    await chooseTimezone(page, section, "Europe/London");
    const expected = structuredClone(before);
    expected[mode === "Global" ? 1 : 0].timezone = "Europe/London";
    expect(await savedSchedules(page)).toEqual(expected);
    await expect(
      page.getByRole("radio", { name: mode, exact: true }).first()
    ).toBeChecked();
  });
}
