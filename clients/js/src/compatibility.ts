/**
 * Historical editor-shaped inputs from @vexilla/client 1.0.3.
 * Canonical SDK types live in ./types; these models retain legacy input support.
 */
export type LegacyFeatureTypeToggle = "toggle";
export type LegacyFeatureTypeGradual = "gradual";
export type LegacyFeatureTypeSelective = "selective";
export type LegacyFeatureTypeValue = "value";

export type LegacyScheduleType = "" | "global" | "environment";
export type LegacyInputType = "number" | "string";
export type LegacyNumberType = "int" | "float";

export type LegacyFeatureTypeString =
  | LegacyFeatureTypeToggle
  | LegacyFeatureTypeGradual
  | LegacyFeatureTypeSelective
  | LegacyFeatureTypeValue;

export interface LegacySchedule {
  start: number | null;
  end: number | null;
  timezone: string | "UTC";
  timeType: "none" | "start/end" | "daily";
  startTime: number;
  endTime: number;
}

export interface LegacyEnvironment {
  name: string;
  environmentId: string;
  defaultEnvironmentFeatureValues: DefaultFeatureValues;
  features: Record<string, LegacyFeature>;
}

export type LegacyFeature =
  | LegacyToggleFeature
  | LegacyGradualFeature
  | LegacySelectiveFeature
  | LegacyValueFeature;

export interface FeatureSettings {
  [key: string]: LegacyFeature;
}

export type DefaultFeatureValues = {
  toggle: LegacyToggleFeature;
  gradual: LegacyGradualFeature;
  selective: LegacySelectiveFeature;
  value: LegacyValueFeature;
};

// export interface Feature {
//   name: string;
//   featureId: string;
//   featureType: LegacyFeatureTypeString;
//   scheduleType: LegacyScheduleType;
//   schedule: LegacySchedule;
// }

export interface Group {
  name: string;
  groupId: string;
  features: Record<string, LegacyFeature>;
  environments: Record<string, LegacyEnvironment>;
}

/** @deprecated Use VexillaEnvironment for SDK data. */
export type PublishedEnvironment = Omit<
  LegacyEnvironment,
  "defaultEnvironmentFeatureValues"
>;

/** @deprecated Use VexillaGroup for SDK data. */
export interface PublishedGroup {
  name: string;
  groupId: string;
  features: Record<string, LegacyFeature>;
  environments: Record<string, PublishedEnvironment>;
  meta: { version: "v1" };
}

export interface UpdatePayload<T> {
  previous: T;
  current: T;
}

export interface DefaultValuesPayload {
  environment: LegacyEnvironment;
  defaultValues: DefaultFeatureValues;
}

export interface LegacyFeatureBase {
  name: string;
  featureType: LegacyFeatureTypeString;
  featureId: string;
  scheduleType: LegacyScheduleType;
  schedule: LegacySchedule;
}

export interface LegacyToggleFeature extends LegacyFeatureBase {
  featureType: LegacyFeatureTypeToggle;
  value: boolean;
}

export interface LegacyGradualFeature extends LegacyFeatureBase {
  featureType: LegacyFeatureTypeGradual;
  value: number;
  seed: number;
}

export interface LegacyValueFeatureString extends LegacyFeatureBase {
  featureType: LegacyFeatureTypeValue;
  value: string;
  valueType: "string";
}

export interface LegacyValueFeatureNumber extends LegacyFeatureBase {
  featureType: LegacyFeatureTypeValue;
  value: number;
  valueType: "number";
  numberType: "int" | "float";
}

export type LegacyValueFeature =
  | LegacyValueFeatureString
  | LegacyValueFeatureNumber;

export interface LegacySelectiveFeatureBase extends LegacyFeatureBase {
  featureType: LegacyFeatureTypeSelective;
  valueType: LegacyInputType;
  value: (string | number)[];
}

export interface LegacySelectiveFeatureStrings
  extends LegacySelectiveFeatureBase {
  featureType: LegacyFeatureTypeSelective;
  valueType: "string";
  value: string[];
}

export interface LegacySelectiveFeatureNumbers
  extends LegacySelectiveFeatureBase {
  featureType: LegacyFeatureTypeSelective;
  valueType: "number";
  value: number[];
  numberType: LegacyNumberType;
}

export type LegacySelectiveFeature =
  | LegacySelectiveFeatureStrings
  | LegacySelectiveFeatureNumbers;

export interface LegacyManifestGroup {
  name: string;
  groupId: string;
}

export interface LegacyManifest {
  version: string;
  groups: LegacyManifestGroup[];
}
