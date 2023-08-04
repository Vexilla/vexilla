import {
  VexillaClientConfig,
  VexillaFeatureTypeToggle,
  VexillaFeatureTypeGradual,
  VexillaFeatureTypeSelective,
  VexillaFlags,
  VexillaGradualFeature,
  VexillaManifest,
  PublishedGroup,
} from "@vexilla/types";

import Hasher from "./hasher";
import {
  createEnvironmentLookupTable,
  createFeatureLookupTable,
  createGroupLookupTable,
} from "./utils/lookup_tables";

const LATEST_MANIFEST_VERSION = 1;

type FetchHook<T> = (url: string) => Promise<T>;

export class VexillaClient {
  protected suppressLogs;
  protected baseUrl: string;
  protected environment: string;
  protected customInstanceHash = "";

  protected manifest: VexillaManifest;
  protected flagGroups: Record<string, PublishedGroup> = {};
  protected groupLookupTable: Record<string, string> = {};
  protected featureLookupTable: Record<string, Record<string, string>> = {};
  protected environmentLookupTable: Record<string, Record<string, string>> = {};

  constructor(config: VexillaClientConfig, suppressLogs = true) {
    this.suppressLogs = suppressLogs;
    this.baseUrl = config.baseUrl;
    this.environment = config.environment || "prod";
    this.customInstanceHash = config.customInstanceHash;
  }

  async getManifest(
    fetchHook: FetchHook<VexillaManifest>
  ): Promise<VexillaManifest> {
    try {
      return fetchHook(`${this.baseUrl}/manifest.json`);
    } catch (e: any) {
      this.warn("Error: failed to fetch manifest", e);
      return { version: "v0", groups: {} };
    }
  }

  async setManifest(manifest: VexillaManifest) {
    this.manifest = manifest;
    this.groupLookupTable = createGroupLookupTable(manifest.groups);

    const currentVersion = this.manifest.version
      ? parseInt(this.manifest.version.replace("v", ""))
      : 0;

    if (currentVersion !== LATEST_MANIFEST_VERSION) {
      throw new Error(
        `Manifest version mismatch. Current: ${currentVersion} - Required: ${LATEST_MANIFEST_VERSION}. You must either use an appropriate client or you must update your schema.`
      );
    }
  }

  async syncManifest() {
    const manifest = await this.getManifest(async (url) => {
      const response = await fetch(url);
      return response.json();
    });

    this.setManifest(manifest);
  }

  async getFlags(
    fileName: string,
    fetchHook: FetchHook<VexillaFlags>
  ): Promise<PublishedGroup> {
    if (!this.manifest) {
      throw new Error("Manifest is not fetched");
    }

    let flagFileName = fileName.replace(".json", "");
    let groupId = this.groupLookupTable[flagFileName];

    if (!groupId) {
      throw new Error("FlagGroup not found in manifest.");
    }

    const flagsResponse: any = await fetchHook(
      `${this.baseUrl}/${groupId}.json`
    );
    return flagsResponse;
  }

  setFlags(groupName: string, flags: PublishedGroup) {
    let flagFileName = groupName.replace(".json", "");
    let groupId = this.groupLookupTable[flagFileName];

    this.featureLookupTable[groupId] = createFeatureLookupTable(flags.features);
    this.environmentLookupTable[groupId] = createEnvironmentLookupTable(
      flags.environments
    );

    this.flagGroups[groupId] = flags;
  }

  async syncFlags(fileName: string, fetchHook: FetchHook<VexillaFlags>) {
    if (!this.manifest) {
      throw new Error("Manifest is not fetched");
    }

    const flags = await this.getFlags(fileName, fetchHook);
    this.setFlags(fileName, flags);
  }

  should(groupName: string, featureName: string) {
    const scrubbedGroupName = groupName.replace(".json", "");
    const groupId = this.groupLookupTable[scrubbedGroupName];
    if (!this.flagGroups[groupId]) {
      this.warn("should() called before flags were fetched for this group");
      return false;
    }

    const environmentId =
      this.environmentLookupTable[groupId][this.environment];
    if (!environmentId) {
      this.warn("Environment could not be found", this.environment);
      return false;
    }

    const environment = this.flagGroups[groupId].environments[environmentId];
    if (!environment) {
      this.warn(
        `Environment (${this.environment}) not found in group (${groupName}, ${groupId}).`
      );

      return false;
    }

    const featureId = this.featureLookupTable[groupId][featureName];
    if (!featureId) {
      this.warn("Environment could not be found", this.environment);
      return false;
    }

    let feature = environment.features[featureId];

    if (!feature) {
      this.warn(
        "feature is undefined for: ",
        this.environment,
        groupName,
        featureName
      );
      return false;
    }

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

        if (!this.customInstanceHash) {
          console.error(
            "customInstanceHash config must be defined when using 'gradual' Feature Types"
          );
          return false;
        }
        feature = feature as VexillaGradualFeature;

        _should =
          this.getInstancePercentile(feature.seed) <= feature.value * 100;
        break;

      default:
        throw Error(`Unsupported Feature Type: ${feature.featureType}`);
    }

    return _should;
  }

  protected getInstancePercentile(seed: number) {
    const hasher = new Hasher(seed);
    return hasher.hashString(this.customInstanceHash);
  }

  protected log(...props) {
    if (!this.suppressLogs) {
      console.log(...props);
    }
  }

  protected warn(...props) {
    if (!this.suppressLogs) {
      console.warn(...props);
    }
  }
}
