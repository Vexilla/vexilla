// Generated from schema/v1 by pnpm --filter @vexilla/types generate. Do not edit.
export interface PublishedManifest {
  version: "v1";
  groups: PublishedManifestGroup[];
  [k: string]: unknown;
}
export interface PublishedManifestGroup {
  name: string;
  groupId: string;
  [k: string]: unknown;
}

export type PublishedFeature = {
  featureType: string;
} & (PublishedToggle | PublishedGradual | PublishedSelective | PublishedValue);
export type PublishedSelective = PublishedSelectiveString | PublishedSelectiveNumber;
export type PublishedSelectiveNumber = PublishedSelectiveInt | PublishedSelectiveFloat;
export type PublishedValue = PublishedValueString | PublishedValueNumber;
export type PublishedValueNumber = PublishedValueInt | PublishedValueFloat;

export interface PublishedGroup {
  name: string;
  groupId: string;
  meta: {
    version: "v1";
    [k: string]: unknown;
  };
  features: {
    [k: string]: PublishedFeature;
  };
  environments: {
    [k: string]: PublishedEnvironment;
  };
  [k: string]: unknown;
}
export interface PublishedToggle {
  name: string;
  featureId: string;
  featureType: "toggle";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  value: boolean;
  [k: string]: unknown;
}
export interface PublishedSchedule {
  start: number;
  end: number;
  startTime: number;
  endTime: number;
  timezone: string;
  timeType: "none" | "start/end" | "daily";
  [k: string]: unknown;
}
export interface PublishedGradual {
  name: string;
  featureId: string;
  featureType: "gradual";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  value: number;
  seed: number;
  [k: string]: unknown;
}
export interface PublishedSelectiveString {
  name: string;
  featureId: string;
  featureType: "selective";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  valueType: "string";
  value: string[];
  [k: string]: unknown;
}
export interface PublishedSelectiveInt {
  name: string;
  featureId: string;
  featureType: "selective";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  valueType: "number";
  value: number[];
  numberType: "int";
  [k: string]: unknown;
}
export interface PublishedSelectiveFloat {
  name: string;
  featureId: string;
  featureType: "selective";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  valueType: "number";
  value: number[];
  numberType: "float";
  [k: string]: unknown;
}
export interface PublishedValueString {
  name: string;
  featureId: string;
  featureType: "value";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  valueType: "string";
  value: string;
  [k: string]: unknown;
}
export interface PublishedValueInt {
  name: string;
  featureId: string;
  featureType: "value";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  valueType: "number";
  value: number;
  numberType: "int";
  [k: string]: unknown;
}
export interface PublishedValueFloat {
  name: string;
  featureId: string;
  featureType: "value";
  scheduleType: "" | "global" | "environment";
  schedule: PublishedSchedule;
  valueType: "number";
  value: number;
  numberType: "float";
  [k: string]: unknown;
}
export interface PublishedEnvironment {
  name: string;
  environmentId: string;
  features: {
    [k: string]: PublishedFeature;
  };
  [k: string]: unknown;
}
