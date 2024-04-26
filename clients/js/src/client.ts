import {
  VexillaClientConfig,
  VexillaFeatureTypeToggle,
  VexillaFeatureTypeGradual,
  VexillaFeatureTypeSelective,
  VexillaFlags,
  VexillaGradualFeature,
  VexillaManifest,
  PublishedGroup,
  VexillaFeature,
  VexillaEnvironment,
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

export class VexillaClient {
  protected showLogs;
  protected baseUrl: string;
  protected environment: string;
  protected customInstanceId = "";

  protected manifest: VexillaManifest;
  protected flagGroups: Record<string, PublishedGroup> = {};
  protected groupLookupTable: Record<string, string> = {};
  protected featureLookupTable: Record<string, Record<string, string>> = {};
  protected environmentLookupTable: Record<string, Record<string, string>> = {};

  constructor(config: VexillaClientConfig, showLogs = false) {
    this.showLogs = showLogs;
    this.baseUrl = config.baseUrl;
    this.environment = config.environment || "prod";
    this.customInstanceId = config.customInstanceId;
  }

  async getManifest(
    fetchHook: FetchHook<VexillaManifest>
  ): Promise<VexillaManifest> {
    try {
      const result = await fetchHook(`${this.baseUrl}/manifest.json`);
      return result;
    } catch (e: any) {
      this.warn("Error: failed to fetch manifest", e);
      return { version: "v0", groups: [] };
    }
  }

  async setManifest(manifest: VexillaManifest) {
    this.manifest = manifest;
    this.groupLookupTable = createGroupLookupTable(manifest.groups);
  }

  async syncManifest(fetchHook: FetchHook<VexillaManifest>) {
    const manifest = await this.getManifest(fetchHook);
    this.setManifest(manifest);
  }

  async getFlags(
    groupNameOrId: string,
    fetchHook: FetchHook<PublishedGroup>
  ): Promise<PublishedGroup> {
    if (!this.manifest) {
      throw new Error("Manifest is not fetched");
    }
    let groupId = this.groupLookupTable[groupNameOrId];

    if (!groupId) {
      throw new Error("FlagGroup not found in manifest.");
    }

    const flagsResponse: PublishedGroup = await fetchHook(
      `${this.baseUrl}/${groupId}.json`
    );
    return flagsResponse;
  }

  setFlags(flags: PublishedGroup) {
    let groupId = this.groupLookupTable[flags.groupId];

    this.featureLookupTable[groupId] = createFeatureLookupTable(flags.features);
    this.environmentLookupTable[groupId] = createEnvironmentLookupTable(
      flags.environments
    );

    this.flagGroups[groupId] = flags;
  }

  async syncFlags(groupNameOrId: string, fetchHook: FetchHook<PublishedGroup>) {
    if (!this.manifest) {
      throw new Error("Manifest is not fetched");
    }

    const flags = await this.getFlags(groupNameOrId, fetchHook);
    this.setFlags(flags);
  }

  should(
    groupNameOrId: string,
    featureName: string,
    customInstanceId?: string | number
  ): boolean {
    const actualItems = this.getActualItems(groupNameOrId, featureName);

    let { feature } = actualItems;

    if (!isScheduledFeatureActive(feature)) {
      return false;
    }

    let _should = false;
    switch (feature.featureType) {
      case VexillaFeatureTypeToggle:
        _should = feature.value;
        break;

      case VexillaFeatureTypeGradual:
        if (feature.seed <= 0 || feature.seed > 1) {
          throw new Error(
            "feature.seed must be a number value greater than 0 and less than or equal to 1"
          );
        }

        if (!customInstanceId && !this.customInstanceId) {
          throw new Error(
            "customInstanceId config must be defined when using 'gradual' Feature Types"
          );
        }
        feature = feature as VexillaGradualFeature;

        _should =
          hashString(
            `${customInstanceId || this.customInstanceId}`,
            feature.seed
          ) <= feature.value;
        break;

      case VexillaFeatureTypeSelective:
        const instanceHash = customInstanceId || this.customInstanceId;
        _should = (feature.value as (string | number)[]).includes(
          instanceHash || parseFloat(instanceHash as string)
        );
        break;

      default:
        throw Error(`Unsupported Feature Type: ${feature.featureType}`);
    }

    return _should;
  }

  safeShould(
    groupNameOrId: string,
    featureName: string,
    customInstanceId?: string | number
  ) {
    try {
      return this.should(groupNameOrId, featureName, customInstanceId);
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
    environment: PublishedEnvironment;
    group: PublishedGroup;
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
