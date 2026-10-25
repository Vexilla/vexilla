import type {
  VexillaGradualFeature,
  VexillaManifest,
  VexillaManifestGroup,
  VexillaGroup,
  VexillaFeature,
  VexillaEnvironment,
  VexillaClientConfig,
  FetchHook,
} from "./types";
import type {
  LegacyManifest,
  PublishedGroup as LegacyGroup,
} from "./compatibility";

import { hashString } from "./hasher";
import {
  createEnvironmentLookupTable,
  createFeatureLookupTable,
  createGroupLookupTable,
} from "./utils/lookup_tables";
import { isScheduledFeatureActive } from "./scheduling";

function validateSeed(seed: unknown): void {
  if (
    typeof seed !== "number" ||
    !Number.isFinite(seed) ||
    seed <= 0 ||
    seed > 1
  ) {
    throw new Error(
      "feature.seed must be a finite number greater than 0 and less than or equal to 1"
    );
  }
}

export class VexillaClient {
  protected showLogs;
  protected baseUrl: string;
  protected environment: string;
  protected customInstanceHash = "";

  protected manifest: VexillaManifest;
  protected flagGroups: Record<string, VexillaGroup> = {};
  protected groupLookupTable: Record<string, string> = {};
  protected featureLookupTable: Record<string, Record<string, string>> = {};
  protected environmentLookupTable: Record<string, Record<string, string>> = {};

  constructor(config: VexillaClientConfig, showLogs = false) {
    this.showLogs = showLogs;
    this.baseUrl = config.baseUrl;
    this.environment = config.environment || "prod";
    this.customInstanceHash = config.customInstanceId;
  }

  getManifest(fetchHook: FetchHook<VexillaManifest>): Promise<VexillaManifest>;
  getManifest(fetchHook: FetchHook<LegacyManifest>): Promise<LegacyManifest>;
  async getManifest(
    fetchHook: FetchHook<LegacyManifest>
  ): Promise<LegacyManifest> {
    try {
      const result = await fetchHook(`${this.baseUrl}/manifest.json`);
      return result;
    } catch (e: any) {
      this.warn("Error: failed to fetch manifest", e);
      return { version: "v1", groups: [] };
    }
  }

  async setManifest(manifest: VexillaManifest | LegacyManifest) {
    this.manifest = manifest as VexillaManifest;
    this.groupLookupTable = createGroupLookupTable(
      manifest.groups as VexillaManifestGroup[]
    );
  }

  async syncManifest(fetchHook: FetchHook<VexillaManifest | LegacyManifest>) {
    const manifest = await this.getManifest(fetchHook);
    this.setManifest(manifest);
  }

  getFlags(
    groupNameOrId: string,
    fetchHook: FetchHook<VexillaGroup>
  ): Promise<VexillaGroup>;
  getFlags(
    groupNameOrId: string,
    fetchHook: FetchHook<LegacyGroup>
  ): Promise<LegacyGroup>;
  async getFlags(
    groupNameOrId: string,
    fetchHook: FetchHook<LegacyGroup>
  ): Promise<LegacyGroup> {
    if (!this.manifest) {
      throw new Error("Manifest is not fetched");
    }
    let groupId = this.groupLookupTable[groupNameOrId];

    if (!groupId) {
      throw new Error("FlagGroup not found in manifest.");
    }

    const flagsResponse: LegacyGroup = await fetchHook(
      `${this.baseUrl}/${groupId}.json`
    );
    return flagsResponse;
  }

  setFlags(flags: VexillaGroup | LegacyGroup) {
    for (const features of [
      flags.features,
      ...Object.values(flags.environments).map((env) => env.features),
    ]) {
      for (const feature of Object.values(features)) {
        if (feature.featureType === "gradual") {
          validateSeed(feature.seed);
        }
      }
    }
    let groupId = this.groupLookupTable[flags.groupId];

    this.featureLookupTable[groupId] = createFeatureLookupTable(
      flags.features as Record<string, VexillaFeature>
    );
    this.environmentLookupTable[groupId] = createEnvironmentLookupTable(
      flags.environments as Record<string, VexillaEnvironment>
    );

    this.flagGroups[groupId] = flags as VexillaGroup;
  }

  async syncFlags(
    groupNameOrId: string,
    fetchHook: FetchHook<VexillaGroup | LegacyGroup>
  ) {
    if (!this.manifest) {
      throw new Error("Manifest is not fetched");
    }

    const flags = await this.getFlags(groupNameOrId, fetchHook);
    this.setFlags(flags);
  }

  should(
    groupNameOrId: string,
    featureName: string,
    customInstanceHash?: string | number
  ): boolean {
    const actualItems = this.getActualItems(groupNameOrId, featureName);

    let { feature } = actualItems;

    if (!isScheduledFeatureActive(feature)) {
      return false;
    }

    let _should = false;
    switch (feature.featureType) {
      case "toggle":
        _should = feature.value;
        break;

      case "gradual":
        validateSeed(feature.seed);

        if (customInstanceHash == null && this.customInstanceHash == null) {
          throw new Error(
            "customInstanceHash config must be defined when using 'gradual' Feature Types"
          );
        }
        feature = feature as VexillaGradualFeature;

        _should =
          hashString(
            `${customInstanceHash ?? this.customInstanceHash}`,
            feature.seed
          ) <= feature.value;
        break;

      case "selective":
        const instanceHash = customInstanceHash ?? this.customInstanceHash;
        _should = (feature.value as (string | number)[]).includes(instanceHash);
        break;

      default:
        throw Error(`Unsupported Feature Type: ${feature.featureType}`);
    }

    return _should;
  }

  safeShould(
    groupNameOrId: string,
    featureName: string,
    customInstanceHash?: string | number
  ) {
    try {
      return this.should(groupNameOrId, featureName, customInstanceHash);
    } catch (e: unknown) {
      console.warn(e);
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
      throw new Error("Tried calling value on non-value feature.");
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
    } catch (e: unknown) {
      console.warn(e);
      return defaultValue;
    }
  }

  protected getActualItems(
    groupNameOrId: string,
    featureNameOrId: string
  ): {
    environment: VexillaEnvironment;
    group: VexillaGroup;
    feature: VexillaFeature;
  } {
    const groupId = this.groupLookupTable[groupNameOrId];
    const group = this.flagGroups[groupId];

    if (!group) {
      throw new Error(
        "should() called before flags were fetched for this group"
      );
    }

    const environmentId =
      this.environmentLookupTable[groupId][this.environment];
    if (!environmentId) {
      throw new Error(`Environment(${this.environment}) could not be found`);
    }

    const environment = this.flagGroups[groupId].environments[environmentId];
    if (!environment) {
      throw new Error(
        `Environment (${this.environment}) not found in group (${groupNameOrId}, ${groupId}).`
      );
    }

    const featureId = this.featureLookupTable[groupId][featureNameOrId];
    if (!featureId) {
      throw new Error(`Feature(${featureNameOrId}) could not be found`);
    }

    let feature = environment.features[featureId];

    if (!feature) {
      throw new Error(
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
