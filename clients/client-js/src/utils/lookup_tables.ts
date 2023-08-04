import {
  ManifestGroup,
  PublishedEnvironment,
  VexillaFeature,
} from "@vexilla/types";
import Case from "case";

export function createGroupLookupTable(groups: Record<string, ManifestGroup>) {
  const lookupTable: Record<string, string> = {};

  Object.values(groups).forEach(({ name, groupId }) => {
    lookupTable[groupId] = groupId;
    lookupTable[name] = groupId;
    lookupTable[Case.kebab(name)] = groupId;
  });

  return lookupTable;
}

export function createEnvironmentLookupTable(
  environments: Record<string, PublishedEnvironment>
) {
  const lookupTable: Record<string, string> = {};

  Object.values(environments).forEach(({ name, environmentId }) => {
    lookupTable[environmentId] = environmentId;
    lookupTable[name] = environmentId;
    lookupTable[Case.kebab(name)] = environmentId;
  });

  return lookupTable;
}

export function createFeatureLookupTable(
  features: Record<string, VexillaFeature>
) {
  const lookupTable: Record<string, string> = {};

  Object.values(features).forEach(({ name, featureId }) => {
    lookupTable[featureId] = featureId;
    lookupTable[name] = featureId;
    lookupTable[Case.kebab(name)] = featureId;
  });

  return lookupTable;
}
