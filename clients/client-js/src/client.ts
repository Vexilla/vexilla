import {
  VexillaClientConfig,
  VexillaFeatureTypeToggle,
  VexillaFeatureTypeGradual,
  VexillaFeatureTypeSelective,
  VexillaFlags,
  VexillaGradualFeature,
} from "@vexilla/types";

import Hasher from "./hasher";

export class VexillaClient {
  protected baseUrl: string;
  protected environment: string;
  protected customInstanceHash = "";

  protected flags: VexillaFlags;

  constructor(config: VexillaClientConfig) {
    this.baseUrl = config.baseUrl;
    this.environment = config.environment || "prod";
    this.customInstanceHash = config.customInstanceHash;
  }

  async getFlags(fileName: string, fetchHook: (url: string) => Promise<any>) {
    const flagsResponse: any = await fetchHook(`${this.baseUrl}/${fileName}`);
    return flagsResponse;
  }

  setFlags(flags: VexillaFlags) {
    this.flags = flags;
  }

  should(flagName: string, groupName = "untagged") {
    if (!this.flags) {
      return false;
    }

    let flag =
      this.flags["environments"]?.[this.environment]?.[groupName]?.[flagName];

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
        _should = this.getInstancePercentile(flag.seed) <= flag.value;
        break;

      default:
        throw Error(`Unsupported Feature Type: ${flag.type}`);
    }

    return _should;
  }

  private getInstancePercentile(seed: number) {
    const hasher = new Hasher(seed);
    return hasher.hashString(this.customInstanceHash);
  }
}
