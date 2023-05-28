import { HostingAdapter } from "@vexilla/hosts";
import {
  VexillaFeatureTypeToggle,
  VexillaFeatureTypeGradual,
  VexillaFeatureTypeSelective,
} from "./consts";

export type VexillaFeatureTypeString =
  | typeof VexillaFeatureTypeToggle
  | typeof VexillaFeatureTypeGradual
  | typeof VexillaFeatureTypeSelective;

export interface Environment {
  name: string;
  environmentId: string;
  defaultEnvironmentFeatureValues: DefaultFeatureValues;
}

export type VexillaFeature =
  | VexillaToggleFeature
  | VexillaGradualFeature
  | VexillaSelectiveFeature;

export interface Feature {
  name: string;
  options: VexillaFeature;
  featureId: string;
}

export interface FeatureSettings {
  [key: string]: VexillaFeature;
}

export type DefaultFeatureValues = {
  [VexillaFeatureTypeToggle]: VexillaToggleFeature;
  [VexillaFeatureTypeGradual]: VexillaGradualFeature;
  [VexillaFeatureTypeSelective]: VexillaSelectiveFeature;
};

export interface Group {
  name: string;
  groupId: string;
  features: Feature[];
  featuresSettings: FeatureSettings;
  environments: Environment[];
}

export interface AppState {
  groups: Group[];
  hosting?: HostingAdapter;
  existingFeatures: any;
}

export interface UpdatePayload<T> {
  previous: T;
  current: T;
}

export interface FeatureSettingPayload {
  feature: Feature;
  environment: Environment;
  type: VexillaFeatureTypeString;
  settings: VexillaFeature;
}

export interface DefaultValuesPayload {
  environment: Environment;
  defaultValues: DefaultFeatureValues;
}

export interface VexillaToggleFeature {
  type: typeof VexillaFeatureTypeToggle;
  value: boolean;
}

export interface VexillaGradualFeature {
  type: typeof VexillaFeatureTypeGradual;
  value: number;
  seed: number;
}

export interface VexillaSelectiveFeature {
  type: typeof VexillaFeatureTypeSelective;
}

export interface VexillaFeatureSet {
  [key: string]:
    | VexillaToggleFeature
    | VexillaGradualFeature
    | VexillaSelectiveFeature;
}

export interface VexillaEnvironment {
  [key: string]: VexillaFeatureSet;
}

export interface VexillaFlags {
  [key: string]: VexillaEnvironment;
}

export interface VexillaClientConfig {
  baseUrl: string;
  environment: string;
  customInstanceHash?: string;
}
