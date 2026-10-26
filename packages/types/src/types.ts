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

// Stable aliases for the shared published contract.
export type {
  PublishedManifest as VexillaManifest,
  PublishedManifestGroup as ManifestGroup,
} from "./published";
