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
  protected customInstanceHash = "";

  protected manifest: VexillaManifest;
  protected flagGroups: Record<string, PublishedGroup> = {};
  protected groupLookupTable: Record<string, string> = {};
  protected featureLookupTable: Record<string, Record<string, string>> = {};
  protected environmentLookupTable: Record<string, Record<string, string>> = {};

  constructor(config: VexillaClientConfig, showLogs = false) {
    this.showLogs = showLogs;
    this.baseUrl = config.baseUrl;
    this.environment = config.environment || "prod";
    this.customInstanceHash = config.customInstanceHash;
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

  setFlags(groupNameOrId: string, flags: PublishedGroup) {
    let groupId = this.groupLookupTable[groupNameOrId];

    this.featureLookupTable[groupId] = createFeatureLookupTable(flags.features);
    this.environmentLookupTable[groupId] = createEnvironmentLookupTable(
      flags.environments
    );

    this.flagGroups[groupId] = flags;
  }

  async syncFlags(fileName: string, fetchHook: FetchHook<PublishedGroup>) {
    if (!this.manifest) {
      throw new Error("Manifest is not fetched");
    }

    const flags = await this.getFlags(fileName, fetchHook);
    this.setFlags(fileName, flags);
  }

  should(
    groupNameOrId: string,
    featureName: string,
    customInstanceHash?: string | number
  ): boolean {
    const actualItems = this.getActualItems(groupNameOrId, featureName);

    if (!actualItems.success) {
      return false;
    }

    let { feature } = actualItems;

    let _should = false;
    switch (feature.featureType) {
      case VexillaFeatureTypeToggle:
        _should = feature.value;
        break;

      case VexillaFeatureTypeGradual:
        if (feature.seed <= 0 || feature.seed > 1) {
          console.error(
            "seed must be a number value greater than 0 and less than or equal to 1"
          );
          return false;
        }

        if (!customInstanceHash && !this.customInstanceHash) {
          console.error(
            "customInstanceHash config must be defined when using 'gradual' Feature Types"
          );
          return false;
        }
        feature = feature as VexillaGradualFeature;

        _should =
          hashString(
            `${customInstanceHash || this.customInstanceHash}`,
            feature.seed
          ) <= feature.value;
        break;

      case VexillaFeatureTypeSelective:
        const instanceHash = customInstanceHash || this.customInstanceHash;
        _should = (feature.value as (string | number)[]).includes(
          instanceHash || parseFloat(instanceHash as string)
        );
        break;

      default:
        throw Error(`Unsupported Feature Type: ${feature.featureType}`);
    }

    return _should;
  }

  value(
    groupNameOrId: string,
    featureName: string,
    defaultValue: string | number | null = null
  ): string | number | null {
    const actualItems = this.getActualItems(groupNameOrId, featureName);

    if (!actualItems.success) {
      return defaultValue;
    }

    if (actualItems.feature.featureType !== "value") {
      this.warn("Error: Tried calling value on non-value feature.");
      return defaultValue;
    }

    if (!isScheduledFeatureActive(actualItems.feature)) {
      return defaultValue;
    }

    return actualItems.feature.value;
  }

  protected getActualItems(
    groupNameOrId: string,
    featureName: string
  ):
    | {
        success: true;
        environment: PublishedEnvironment;
        group: PublishedGroup;
        feature: VexillaFeature;
      }
    | { success: false } {
    const groupId = this.groupLookupTable[groupNameOrId];
    const group = this.flagGroups[groupId];

    if (!group) {
      this.warn("should() called before flags were fetched for this group");
      return { success: false };
    }

    const environmentId =
      this.environmentLookupTable[groupId][this.environment];
    if (!environmentId) {
      this.warn("Environment could not be found", this.environment);
      return { success: false };
    }

    const environment = this.flagGroups[groupId].environments[environmentId];
    if (!environment) {
      this.warn(
        `Environment (${this.environment}) not found in group (${groupNameOrId}, ${groupId}).`
      );
      return { success: false };
    }

    const featureId = this.featureLookupTable[groupId][featureName];
    if (!featureId) {
      this.warn("Feature could not be found", this.environment);
      return { success: false };
    }

    let feature = environment.features[featureId];

    if (!feature) {
      this.warn(
        "feature is undefined for: ",
        this.environment,
        groupNameOrId,
        featureName
      );
      return { success: false };
    }

    return {
      success: true,
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
