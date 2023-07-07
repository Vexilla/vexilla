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
import * as Case from "case";

import Hasher from "./hasher";

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

  constructor(config: VexillaClientConfig, suppressLogs = false) {
    this.suppressLogs = suppressLogs;
    this.baseUrl = config.baseUrl;
    this.environment = config.environment || "prod";
    this.customInstanceHash = config.customInstanceHash;
  }

  async getManifest(
    fetchHook: FetchHook<VexillaManifest>
  ): Promise<[VexillaManifest, Record<string, string>]> {
    try {
      const manifestResponse = await fetchHook(`${this.baseUrl}/manifest.json`);

      const groupLookupTable: Record<string, string> = {};

      manifestResponse.groups.forEach((_group) => {
        const scrubbedName = _group.name.replace(".json", "");
        groupLookupTable[_group.groupId] = _group.groupId;
        groupLookupTable[scrubbedName] = _group.groupId;
        groupLookupTable[Case.kebab(scrubbedName)] = _group.groupId;
      });

      return [manifestResponse, groupLookupTable];
    } catch (e: any) {
      return [{ version: "v0", groups: [] }, {}];
    }
  }

  async setManifest(
    manifest: VexillaManifest,
    groupLookupTable: Record<string, string>
  ) {
    this.manifest = manifest;
    this.groupLookupTable = groupLookupTable;

    const currentVersion = this.manifest.version
      ? parseInt(this.manifest.version.replace("v", ""))
      : 0;

    if (currentVersion !== LATEST_MANIFEST_VERSION) {
      throw new Error(
        `Manifest version mismatch. Current: ${currentVersion} - Required: ${LATEST_MANIFEST_VERSION}. You must either use an appropriate client or you must update your schema.`
      );
    }

    const fetchedFlags = await Promise.all(
      this.manifest.groups.map((group) =>
        this.getFlags(group.name, async (url) => {
          const response = await fetch(url);
          return response.json();
        })
      )
    );

    fetchedFlags.forEach((flagGroup) => {
      this.flagGroups[flagGroup.groupId] = flagGroup;
    });
  }

  async syncManifest() {
    const [manifest, groupLookupTable] = await this.getManifest(async (url) => {
      const response = await fetch(url);
      return response.json();
    });

    this.setManifest(manifest, groupLookupTable);
  }

  async getFlags(
    fileName: string,
    fetchHook: FetchHook<VexillaFlags>
  ): Promise<PublishedGroup> {
    let flagFileName = fileName.replace(".json", "");
    let groupId = flagFileName;
    if (this.manifest) {
      groupId = this.groupLookupTable[flagFileName];
    }

    const flagsResponse: any = await fetchHook(
      `${this.baseUrl}/${groupId}.json`
    );
    return flagsResponse;
  }

  setFlags(groupId: string, flags: PublishedGroup) {
    groupId = this.groupLookupTable[groupId];
    this.flagGroups[groupId] = flags;
  }

  // combined getter and setter
  async updateFlags(fileName: string, fetchHook: FetchHook<VexillaFlags>) {
    const flags = await this.getFlags(fileName, fetchHook);
  }

  should(flagName: string, groupName: string) {
    const groupId = this.groupLookupTable[groupName];
    if (!this.flagGroups[groupId]) {
      this.warn("should() called before flags were fetched for this group");
      return false;
    }

    // const environmentId =
    const environment = this.flagGroups[groupId].environments.find(
      (_environment) =>
        _environment.environmentId === this.environment ||
        _environment.name === this.environment ||
        _environment.name === Case.kebab(this.environment)
    );

    if (!environment) {
      console.error(
        `Environment (${this.environment}) not found in group (${groupName}, ${groupId}).`
      );

      return false;
    }

    const feature = this.flagGroups[groupId].features.find(
      (_feature) =>
        _feature.featureId === flagName ||
        _feature.name === flagName ||
        _feature.name === Case.kebab(flagName)
    );

    let flag = environment.features[feature.featureId];

    if (!flag) {
      console.error(
        "flag is undefined for: ",
        this.environment,
        groupName,
        flagName
      );
      return false;
    }

    let _should = false;
    switch (flag.type) {
      case VexillaFeatureTypeToggle:
        _should = flag.value;
        break;

      case VexillaFeatureTypeGradual:
        if (flag.seed <= 0 || flag.seed > 1) {
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
        flag = flag as VexillaGradualFeature;
        _should = this.getInstancePercentile(flag.seed) <= flag.value * 100;
        break;

      default:
        throw Error(`Unsupported Feature Type: ${flag.type}`);
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
