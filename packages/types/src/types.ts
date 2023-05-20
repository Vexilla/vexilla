/*

Leaving off:

  - fix type issues
  - add build script for exporting into other repos

*/

import {
  VexillaToggleFeature,
  VexillaGradualFeature,
  VexillaFeatureType,
  VexillaSelectiveFeature,
} from "@vexilla/client";

import { HostingAdapter } from "@vexilla/hosts";

export type VexillaFeatureTypeString = "gradual" | "toggle" | "selective";

export interface Environment {
  name: string;
}

export type VexillaFeature =
  | VexillaToggleFeature
  | VexillaGradualFeature
  | VexillaSelectiveFeature;

export interface Feature {
  name: string;
  type: VexillaFeatureTypeString;
  options: VexillaFeature;
}

export interface FeatureSettings {
  [key: string]: VexillaFeature;
}

// export interface DefaultFeatureValues {
//   [key: VexillaFeatureType]: VexillaFeature;
// }

export type DefaultFeatureValues = {
  [P in VexillaFeatureTypeString]: VexillaFeature;
};

export interface DefaultEnvironmentFeatureValues {
  [key: string]: DefaultFeatureValues;
}

export interface AppState {
  features: Feature[];
  featuresSettings: FeatureSettings;
  environments: Environment[];
  hosting: HostingAdapter;
  defaultEnvironmentFeatureValues: DefaultEnvironmentFeatureValues;
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
