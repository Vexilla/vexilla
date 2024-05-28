export type VexillaFeatureTypeToggle = "toggle";
export type VexillaFeatureTypeGradual = "gradual";
export type VexillaFeatureTypeSelective = "selective";
export type VexillaFeatureTypeValue = "value";

export type VexillaScheduleType = "" | "global" | "environment";
export type VexillaInputType = "number" | "string";
export type VexillaNumberType = "int" | "float";

export type VexillaFeatureTypeString =
  | VexillaFeatureTypeToggle
  | VexillaFeatureTypeGradual
  | VexillaFeatureTypeSelective
  | VexillaFeatureTypeValue;

export interface VexillaSchedule {
  start: number | null;
  end: number | null;
  timezone: string | "UTC";
  timeType: "none" | "start/end" | "daily";
  startTime: number;
  endTime: number;
}

export interface VexillaEnvironment {
  name: string;
  environmentId: string;
  defaultEnvironmentFeatureValues: DefaultFeatureValues;
  features: Record<string, VexillaFeature>;
}

export type VexillaFeature =
  | VexillaToggleFeature
  | VexillaGradualFeature
  | VexillaSelectiveFeature
  | VexillaValueFeature;

export interface FeatureSettings {
  [key: string]: VexillaFeature;
}

export type DefaultFeatureValues = {
  toggle: VexillaToggleFeature;
  gradual: VexillaGradualFeature;
  selective: VexillaSelectiveFeature;
  value: VexillaValueFeature;
};

// export interface Feature {
//   name: string;
//   featureId: string;
//   featureType: VexillaFeatureTypeString;
//   scheduleType: VexillaScheduleType;
//   schedule: VexillaSchedule;
// }

export interface Group {
  name: string;
  groupId: string;
  features: Record<string, VexillaFeature>;
  environments: Record<string, VexillaEnvironment>;
}

export type PublishedEnvironment = Omit<
  VexillaEnvironment,
  "defaultEnvironmentFeatureValues"
>;

export interface PublishedGroup {
  name: string;
  groupId: string;
  features: Record<string, VexillaFeature>;
  environments: Record<string, PublishedEnvironment>;
  meta: { version: "v1" };
}

export interface UpdatePayload<T> {
  previous: T;
  current: T;
}

export interface DefaultValuesPayload {
  environment: VexillaEnvironment;
  defaultValues: DefaultFeatureValues;
}

export interface VexillaFeatureBase {
  name: string;
  featureType: VexillaFeatureTypeString;
  featureId: string;
  scheduleType: VexillaScheduleType;
  schedule: VexillaSchedule;
}

export interface VexillaToggleFeature extends VexillaFeatureBase {
  featureType: VexillaFeatureTypeToggle;
  value: boolean;
}

export interface VexillaGradualFeature extends VexillaFeatureBase {
  featureType: VexillaFeatureTypeGradual;
  value: number;
  seed: number;
}

export interface VexillaValueFeatureString extends VexillaFeatureBase {
  featureType: VexillaFeatureTypeValue;
  value: string;
  valueType: "string";
}

export interface VexillaValueFeatureNumber extends VexillaFeatureBase {
  featureType: VexillaFeatureTypeValue;
  value: number;
  valueType: "number";
  numberType: "int" | "float";
}

export type VexillaValueFeature =
  | VexillaValueFeatureString
  | VexillaValueFeatureNumber;

export interface VexillaSelectiveFeatureBase extends VexillaFeatureBase {
  featureType: VexillaFeatureTypeSelective;
  valueType: VexillaInputType;
  value: (string | number)[];
}

export interface VexillaSelectiveFeatureStrings
  extends VexillaSelectiveFeatureBase {
  featureType: VexillaFeatureTypeSelective;
  valueType: "string";
  value: string[];
}

export interface VexillaSelectiveFeatureNumbers
  extends VexillaSelectiveFeatureBase {
  featureType: VexillaFeatureTypeSelective;
  valueType: "number";
  value: number[];
  numberType: VexillaNumberType;
}

export type VexillaSelectiveFeature =
  | VexillaSelectiveFeatureStrings
  | VexillaSelectiveFeatureNumbers;

export interface VexillaFeatureSet {
  [key: string]:
    | VexillaToggleFeature
    | VexillaGradualFeature
    | VexillaSelectiveFeature;
}

export interface VexillaFlags {
  [key: string]: VexillaEnvironment;
}

export interface VexillaClientConfig {
  baseUrl: string;
  environment: string;
  customInstanceId?: string;
}

export interface ManifestGroup {
  name: string;
  groupId: string;
}

export interface VexillaManifest {
  version: string;
  groups: ManifestGroup[];
}
