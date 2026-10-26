import type {
  PublishedFeature as VexillaFeature,
  PublishedToggle as VexillaToggleFeature,
  PublishedGradual as VexillaGradualFeature,
  PublishedSelective as VexillaSelectiveFeature,
  PublishedEnvironment as VexillaEnvironment,
} from "@vexilla/types";

// Public SDK names for the schema-derived contract.
export type {
  VexillaFeatureTypeToggle,
  VexillaFeatureTypeGradual,
  VexillaFeatureTypeSelective,
  VexillaFeatureTypeValue,
  VexillaScheduleType,
  VexillaInputType,
  VexillaNumberType,
  VexillaFeatureTypeString,
  PublishedFeature as VexillaFeature,
  PublishedToggle as VexillaToggleFeature,
  PublishedGradual as VexillaGradualFeature,
  PublishedSelective as VexillaSelectiveFeature,
  PublishedSelectiveString as VexillaSelectiveFeatureStrings,
  PublishedSelectiveNumber as VexillaSelectiveFeatureNumbers,
  PublishedValue as VexillaValueFeature,
  PublishedValueString as VexillaValueFeatureString,
  PublishedValueNumber as VexillaValueFeatureNumber,
  PublishedSchedule as VexillaSchedule,
  PublishedManifest as VexillaManifest,
  PublishedManifestGroup as VexillaManifestGroup,
  PublishedManifestGroup as ManifestGroup,
  PublishedGroup as VexillaGroup,
  PublishedEnvironment as VexillaEnvironment,
} from "@vexilla/types";

export type VexillaFeatureBase = Pick<
  VexillaFeature,
  "name" | "featureId" | "featureType" | "scheduleType" | "schedule"
>;
export type VexillaSelectiveFeatureBase = VexillaFeatureBase & {
  featureType: "selective";
  valueType: "string" | "number";
  value: (string | number)[];
};
export type VexillaFeatureSet = Record<
  string,
  VexillaToggleFeature | VexillaGradualFeature | VexillaSelectiveFeature
>;
export type VexillaFlags = Record<string, VexillaEnvironment>;

export type FetchHook<T> = (url: string) => Promise<T>;
export type TelemetryHook = (
  featureFlag: VexillaFeature,
  flagResult: string | number
) => void | Promise<void>;

export interface VexillaClientConfig {
  baseUrl: string;
  environment?: string;
  customInstanceId?: string | number;
  experimental?: { telemetryHook: TelemetryHook };
}
