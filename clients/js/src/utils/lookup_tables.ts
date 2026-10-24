import {
  ManifestGroup,
  PublishedEnvironment,
  VexillaFeature,
} from "@vexilla/types";
import { normalizeName } from "@vexilla/types";

export function createGroupLookupTable(groups: ManifestGroup[]) {
  const lookupTable: Record<string, string> = Object.create(null);

  groups.forEach(({ name, groupId }) => {
    lookupTable[groupId] = groupId;
    lookupTable[name] = groupId;
    lookupTable[normalizeName(name)] = groupId;
  });

  return lookupTable;
}

export function createEnvironmentLookupTable(
  environments: Record<string, PublishedEnvironment>
) {
  const lookupTable: Record<string, string> = Object.create(null);

  Object.values(environments).forEach(({ name, environmentId }) => {
    lookupTable[environmentId] = environmentId;
    lookupTable[name] = environmentId;
    lookupTable[normalizeName(name)] = environmentId;
  });

  return lookupTable;
}

export function createFeatureLookupTable(
  features: Record<string, VexillaFeature>
) {
  const lookupTable: Record<string, string> = Object.create(null);

  Object.values(features).forEach(({ name, featureId }) => {
    lookupTable[featureId] = featureId;
    lookupTable[name] = featureId;
    lookupTable[normalizeName(name)] = featureId;
  });

  return lookupTable;
}
