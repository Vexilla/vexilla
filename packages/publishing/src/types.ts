import type {
  VexillaFeatureTypeToggle,
  VexillaFeatureTypeGradual,
  VexillaFeatureTypeSelective,
  VexillaFeatureTypeValue,
  VexillaFeatureTypeString,
  VexillaScheduleType,
  VexillaInputType,
  VexillaNumberType,
} from "@vexilla/types";

/** Editable configuration models; incomplete schedules are valid while authoring. */
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

export type DefaultFeatureValues = {
  toggle: VexillaToggleFeature;
  gradual: VexillaGradualFeature;
  selective: VexillaSelectiveFeature;
  value: VexillaValueFeature;
};

export interface Group {
  name: string;
  groupId: string;
  features: Record<string, VexillaFeature>;
  environments: Record<string, VexillaEnvironment>;
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
