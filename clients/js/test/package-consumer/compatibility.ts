import { VexillaClient } from "@vexilla/client";
import type {
  VexillaFeatureTypeToggle,
  VexillaFeatureTypeGradual,
  VexillaFeatureTypeSelective,
  VexillaFeatureTypeValue,
  VexillaScheduleType,
  VexillaInputType,
  VexillaNumberType,
  VexillaFeatureTypeString,
  VexillaSchedule,
  VexillaEnvironment,
  VexillaFeature,
  FeatureSettings,
  DefaultFeatureValues,
  Group,
  PublishedEnvironment,
  PublishedGroup,
  UpdatePayload,
  DefaultValuesPayload,
  VexillaFeatureBase,
  VexillaToggleFeature,
  VexillaGradualFeature,
  VexillaValueFeatureString,
  VexillaValueFeatureNumber,
  VexillaValueFeature,
  VexillaSelectiveFeatureBase,
  VexillaSelectiveFeatureStrings,
  VexillaSelectiveFeatureNumbers,
  VexillaSelectiveFeature,
  VexillaFeatureSet,
  VexillaFlags,
  VexillaClientConfig,
  ManifestGroup,
  VexillaManifest,
} from "@vexilla/client";
import type {
  VexillaClient as DistClient,
  Group as DistGroup,
} from "@vexilla/client/dist/index";

const schedule: VexillaSchedule = {
  start: null,
  end: null,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
};
const toggle: VexillaToggleFeature = {
  name: "Enabled",
  featureId: "toggle",
  featureType: "toggle",
  scheduleType: "",
  schedule,
  value: true,
};
const gradual: VexillaGradualFeature = {
  ...toggle,
  featureType: "gradual",
  value: 25,
  seed: 0.5,
};
const selective: VexillaSelectiveFeatureStrings = {
  ...toggle,
  featureType: "selective",
  valueType: "string",
  value: ["member"],
};
const numberList: VexillaSelectiveFeatureNumbers = {
  ...toggle,
  featureType: "selective",
  valueType: "number",
  numberType: "int",
  value: [1],
};
const stringValue: VexillaValueFeatureString = {
  ...toggle,
  featureType: "value",
  valueType: "string",
  value: "A",
};
const numberValue: VexillaValueFeatureNumber = {
  ...toggle,
  featureType: "value",
  valueType: "number",
  numberType: "float",
  value: 1.5,
};
const defaults: DefaultFeatureValues = {
  toggle,
  gradual,
  selective,
  value: stringValue,
};
const environment: VexillaEnvironment = {
  name: "Development",
  environmentId: "dev",
  defaultEnvironmentFeatureValues: defaults,
  features: { toggle },
};
const group: Group = {
  groupId: "g",
  name: "Group",
  features: { toggle },
  environments: { dev: environment },
};
const published: PublishedGroup = { ...group, meta: { version: "v1" } };
// 1.0.3 accepted version:string and nullable schedule dates.
const version: string = "v1";
const manifest: VexillaManifest = {
  version,
  groups: [{ name: group.name, groupId: group.groupId }],
};
const config: VexillaClientConfig = {
  baseUrl: "https://flags.example",
  environment: "dev",
  customInstanceId: "member",
};
const client: DistClient = new VexillaClient(config);
const distGroup: DistGroup = group;
client.setManifest(manifest);
client.syncManifest(async () => manifest);
client
  .getManifest(async () => manifest)
  .then((value: VexillaManifest) => value.groups);
client.setFlags(published);
client
  .getFlags("g", async () => published)
  .then((value: PublishedGroup) => value.features);
client.syncFlags("g", async () => published);
const should: boolean = client.should("g", "toggle");
const safe: boolean = client.safeShould("g", "toggle");
const value: string | number | null = client.value("g", "value", null);
const safeValue: string | number | null = client.safeValue(
  "g",
  "value",
  "fallback"
);
const update: UpdatePayload<Group> = { previous: group, current: group };
const payload: DefaultValuesPayload = { environment, defaultValues: defaults };
const flags: VexillaFlags = { dev: environment };
const settings: FeatureSettings = { toggle };
const set: VexillaFeatureSet = { toggle, gradual, selective };
const publishedEnvironment: PublishedEnvironment = environment;
