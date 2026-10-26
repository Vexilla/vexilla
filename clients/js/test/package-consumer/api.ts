import { VexillaClient } from "@vexilla/client";
import type {
  VexillaFeature,
  VexillaSchedule,
  VexillaManifest,
  VexillaGroup,
  VexillaEnvironment,
  FetchHook,
  TelemetryHook,
  VexillaClientConfig,
} from "@vexilla/client";
// @ts-expect-error Internal schema names are not SDK exports.
import type { PublishedFeature } from "@vexilla/client";
// @ts-expect-error The SDK uses VexillaGroup for this contract.
import type { WireGroup } from "@vexilla/client";
import type { VexillaGroup as DistGroup } from "@vexilla/client/dist/index";

const schedule: VexillaSchedule = {
  start: 0,
  end: 0,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
};
// @ts-expect-error Canonical SDK schedules use numeric boundaries.
const nullableSchedule: VexillaSchedule = { ...schedule, start: null };
const feature: VexillaFeature = {
  name: "Flag",
  featureId: "f",
  featureType: "toggle",
  scheduleType: "",
  schedule,
  value: true,
};
const environment: VexillaEnvironment = {
  name: "Development",
  environmentId: "dev",
  features: { f: feature },
};
const group: VexillaGroup = {
  name: "Group",
  groupId: "g",
  meta: { version: "v1" },
  features: { f: feature },
  environments: { dev: environment },
};
const manifest: VexillaManifest = {
  version: "v1",
  groups: [{ name: "Group", groupId: "g" }],
};
// @ts-expect-error The schema contract supports version v1.
const unsupportedManifest: VexillaManifest = { ...manifest, version: "v2" };

const hook: TelemetryHook = (flag, result) => {
  const sdkFeature: VexillaFeature = flag;
  void sdkFeature;
  void flag.featureId;
  void result;
};
const config: VexillaClientConfig = {
  baseUrl: "https://example.test",
  environment: "dev",
  experimental: { telemetryHook: hook },
};
const client = new VexillaClient(config);
const fetch: FetchHook<VexillaGroup> = async () => group;
client.getFlags("g", fetch).then((result: VexillaGroup) => result.features.f);
client
  .getManifest(async () => manifest)
  .then((result: VexillaManifest) => result.version);
client.setFlags(group);
client.setManifest(manifest);

// Subclass declarations and returned values use the same public SDK shapes.
class CustomClient extends VexillaClient {
  protected manifest!: VexillaManifest;
  protected flagGroups: Record<string, VexillaGroup> = {};
  inspect(groupId: string, featureId: string) {
    const items: {
      feature: VexillaFeature;
      environment: VexillaEnvironment;
      group: VexillaGroup;
    } = this.getActualItems(groupId, featureId);
    return items;
  }
}
const distGroup: DistGroup = group;
