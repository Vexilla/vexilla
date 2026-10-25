import type {
  VexillaClientConfig,
  VexillaManifest,
  PublishedGroup,
  VexillaFeature,
  PublishedEnvironment,
} from "@vexilla/types";

import { hashString } from "./hasher";
import {
  createEnvironmentLookupTable,
  createFeatureLookupTable,
  createGroupLookupTable,
} from "./utils/lookup_tables";
import { isScheduledFeatureActive } from "./scheduling";

type FetchHook<T> = (url: string) => Promise<T>;

import { VexillaError } from "./errors";
import { isWellFormedUnicode } from "@vexilla/types";
import { validateGroupData, validateManifestData } from "./validation";

function validInstance(value: unknown): asserts value is string | number {
  if (
    !(typeof value === "string" && isWellFormedUnicode(value)) &&
    !(typeof value === "number" && Number.isFinite(value))
  ) {
    throw new VexillaError(
      "instance",
      "A finite numeric or string instance ID is required"
    );
  }
}

export class VexillaClient {
  protected showLogs: boolean;
  protected baseUrl: string;
  protected environment: string;
  protected defaultInstanceId: string | number | undefined;

  protected manifest: VexillaManifest | undefined;
  protected flagGroups: Record<string, PublishedGroup> = Object.create(null);
  protected groupLookupTable: Record<string, string> = Object.create(null);
  protected featureLookupTable: Record<string, Record<string, string>> =
    Object.create(null);
  protected environmentLookupTable: Record<string, Record<string, string>> =
    Object.create(null);

  constructor(
    config: Pick<
      VexillaClientConfig,
      "baseUrl" | "environment" | "customInstanceId"
    >,
    showLogs = false
  ) {
    this.showLogs = showLogs;
    this.baseUrl = config.baseUrl;
    this.environment = config.environment ?? "prod";
    this.defaultInstanceId = config.customInstanceId;
  }

  async getManifest(
    fetchHook: FetchHook<VexillaManifest>
  ): Promise<VexillaManifest> {
    let operationSucceeded = false;
    try {
      let result: unknown;
      try {
        result = await fetchHook(`${this.baseUrl}/manifest.json`);
      } catch (error) {
        throw new VexillaError(
          "fetch",
          "Failed to fetch manifest: " + String(error)
        );
      }
      validateManifestData(result);
      const manifestSnapshot = structuredClone(result);
      operationSucceeded = true;
      return manifestSnapshot;
    } finally {
      const outcome = operationSucceeded ? "success" : "failure";
      this.log(`vexilla operation=manifest.fetch outcome=${outcome}`);
    }
  }

  async setManifest(manifest: VexillaManifest) {
    let operationSucceeded = false;
    try {
      validateManifestData(manifest);
      const snapshot = structuredClone(manifest);
      const groupLookupTable = createGroupLookupTable(snapshot.groups);
      for (const [groupId, group] of Object.entries(this.flagGroups)) {
        if (
          !snapshot.groups.some(
            (entry) => entry.groupId === groupId && entry.name === group.name
          )
        ) {
          delete this.flagGroups[groupId];
          delete this.featureLookupTable[groupId];
          delete this.environmentLookupTable[groupId];
        }
      }
      this.manifest = snapshot;
      this.groupLookupTable = groupLookupTable;

      operationSucceeded = true;
    } finally {
      const outcome = operationSucceeded ? "success" : "failure";
      this.log(`vexilla operation=manifest.install outcome=${outcome}`);
    }
  }

  async syncManifest(fetchHook: FetchHook<VexillaManifest>) {
    await this.setManifest(await this.getManifest(fetchHook));
  }

  async getFlags(
    groupNameOrId: string,
    fetchHook: FetchHook<PublishedGroup>
  ): Promise<PublishedGroup> {
    let operationSucceeded = false;
    try {
      if (!this.manifest) {
        throw new VexillaError("lookup", "Manifest is not fetched");
      }
      const groupId = this.groupLookupTable[groupNameOrId];
      if (!groupId) {
        throw new VexillaError("lookup", "FlagGroup not found in manifest");
      }
      let flags: unknown;
      try {
        flags = await fetchHook(`${this.baseUrl}/${groupId}.json`);
      } catch (error) {
        throw new VexillaError(
          "fetch",
          "Failed to fetch group: " + String(error)
        );
      }
      validateGroupData(flags, this.manifest);
      if (flags.groupId !== groupId) {
        throw new VexillaError(
          "validation",
          "Fetched group does not match the requested group"
        );
      }
      const groupSnapshot = structuredClone(flags);
      operationSucceeded = true;
      return groupSnapshot;
    } finally {
      const outcome = operationSucceeded ? "success" : "failure";
      this.log(`vexilla operation=group.fetch outcome=${outcome}`);
    }
  }

  setFlags(flags: PublishedGroup) {
    let operationSucceeded = false;
    try {
      if (!this.manifest) {
        throw new VexillaError("lookup", "Manifest is not fetched");
      }
      validateGroupData(flags, this.manifest);
      const snapshot = structuredClone(flags);
      const groupId = snapshot.groupId;
      const featureLookupTable = createFeatureLookupTable(snapshot.features);
      const environmentLookupTable = createEnvironmentLookupTable(
        snapshot.environments
      );
      this.featureLookupTable[groupId] = featureLookupTable;
      this.environmentLookupTable[groupId] = environmentLookupTable;
      this.flagGroups[groupId] = snapshot;

      operationSucceeded = true;
    } finally {
      const outcome = operationSucceeded ? "success" : "failure";
      this.log(`vexilla operation=group.install outcome=${outcome}`);
    }
  }

  async syncFlags(groupNameOrId: string, fetchHook: FetchHook<PublishedGroup>) {
    this.setFlags(await this.getFlags(groupNameOrId, fetchHook));
  }

  should(
    groupNameOrId: string,
    featureName: string,
    customInstanceId?: string | number
  ): boolean {
    const { feature } = this.getActualItems(groupNameOrId, featureName);
    if (feature.featureType === "value") {
      throw new VexillaError("kind", "Tried calling should on a value feature");
    }
    const instance = customInstanceId ?? this.defaultInstanceId;
    if (
      feature.featureType === "gradual" ||
      feature.featureType === "selective"
    ) {
      validInstance(instance);
    }
    if (!isScheduledFeatureActive(feature)) {
      return false;
    }
    switch (feature.featureType) {
      case "toggle":
        return feature.value;
      case "gradual":
        return hashString(String(instance), feature.seed) < feature.value;
      case "selective":
        return (feature.value as (string | number)[]).includes(instance);
    }
  }

  safeShould(
    groupNameOrId: string,
    featureName: string,
    customInstanceId?: string | number
  ) {
    try {
      return this.should(groupNameOrId, featureName, customInstanceId);
    } catch {
      this.warn("vexilla operation=should outcome=fallback");
      return false;
    }
  }

  value(
    groupNameOrId: string,
    featureName: string,
    defaultValue: string | number | null = null
  ): string | number | null {
    const actualItems = this.getActualItems(groupNameOrId, featureName);

    if (actualItems.feature.featureType !== "value") {
      throw new VexillaError(
        "kind",
        "Tried calling value on non-value feature."
      );
    }

    if (!isScheduledFeatureActive(actualItems.feature)) {
      return defaultValue;
    }

    return actualItems.feature.value;
  }

  safeValue(
    groupNameOrId: string,
    featureName: string,
    defaultValue: string | number | null = null
  ) {
    try {
      return this.value(groupNameOrId, featureName, defaultValue);
    } catch {
      this.warn("vexilla operation=value outcome=fallback");
      return defaultValue;
    }
  }

  protected getActualItems(
    groupNameOrId: string,
    featureNameOrId: string
  ): {
    environment: PublishedEnvironment;
    group: PublishedGroup;
    feature: VexillaFeature;
  } {
    const groupId = this.groupLookupTable[groupNameOrId];
    const group = this.flagGroups[groupId];

    if (!group) {
      throw new VexillaError(
        "lookup",
        "should() called before flags were fetched for this group"
      );
    }

    const environmentId =
      this.environmentLookupTable[groupId][this.environment];
    if (!environmentId) {
      throw new VexillaError(
        "lookup",
        `Environment(${this.environment}) could not be found`
      );
    }

    const environment = this.flagGroups[groupId].environments[environmentId];
    if (!environment) {
      throw new VexillaError(
        "lookup",
        `Environment (${this.environment}) not found in group (${groupNameOrId}, ${groupId}).`
      );
    }

    const featureId = this.featureLookupTable[groupId][featureNameOrId];
    if (!featureId) {
      throw new VexillaError(
        "lookup",
        `Feature(${featureNameOrId}) could not be found`
      );
    }

    let feature = environment.features[featureId];

    if (!feature) {
      throw new VexillaError(
        "lookup",
        `feature is undefined for environment(${this.environment}), group(${groupNameOrId}), or feature (${featureNameOrId})`
      );
    }

    return {
      environment,
      feature,
      group,
    };
  }

  protected log(...props) {
    if (this.showLogs) {
      console.log(...props);
    }
  }

  protected warn(...props) {
    if (this.showLogs) {
      console.warn(...props);
    }
  }
}
