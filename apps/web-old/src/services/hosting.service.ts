import { AppState, Feature } from "@/store/app";
import { HostingConfigS3, S3Adapter } from "./hosting-adapters/s3.adapter";
import {
  HostingConfigAzure,
  AzureAdapter
} from "./hosting-adapters/azure.adapter";
import {
  HostingConfigGcloud,
  GcloudAdapter
} from "./hosting-adapters/gcloud.adapter";
import {
  HostingConfigFirebase,
  FirebaseAdapter
} from "./hosting-adapters/firebase.adapter";

export type HostingProvider = "s3" | "azure" | "gcloud" | "firebase" | null;

export type HostingConfig =
  | (HostingConfigS3 &
      HostingConfigAzure &
      HostingConfigGcloud &
      HostingConfigFirebase)
  | null;

export enum HostingStatusType {
  NORMAL = "normal",
  ERROR = "error",
  WARNING = "warning"
}

export interface HostingStatus {
  message: string;
  extraDetails?: string;
  route?: string;
  type: HostingStatusType;
}

export interface HostingAdapter {
  provider: HostingProvider;
  config: HostingConfig;
  status: HostingStatus | null;
}

export class HostingService {
  static adapters = {
    s3: S3Adapter,
    azure: AzureAdapter,
    gcloud: GcloudAdapter,
    firebase: FirebaseAdapter
  };

  static async upload(payload: any, hostingAdapter: HostingAdapter) {
    if (hostingAdapter.provider && hostingAdapter.config) {
      const adapter = this.adapters[hostingAdapter.provider];

      return adapter.upload(payload, hostingAdapter.config);
    } else {
      throw new Error("No config.provider passed to upload");
    }
  }

  static formatPayloadFromState(state: AppState) {
    const payload: any = { environments: {} };

    state.environments.forEach(environment => {
      payload.environments[environment.name] = {
        untagged: {}
      };

      state.features.forEach((feature: Feature) => {
        const featureSettings = {
          ...state.featuresSettings[
            `${feature.name}/${environment.name}/${feature.type}`
          ],
          type: feature.type
        };

        payload.environments[environment.name].untagged[feature.name] = {
          ...featureSettings
        };
      });
    });

    return payload;
  }

  static extractStateFromPayload(payload: any) {
    throw new Error("Method not implemented");
  }

  static isConfigValid(hostingAdapter: HostingAdapter) {
    if (hostingAdapter?.provider && hostingAdapter?.config) {
      const adapter = this.adapters[hostingAdapter.provider];

      return adapter.isConfigValid(hostingAdapter.config);
    } else {
      console.log("No Adapter");
      return false;
    }
  }

  static fetchExistingFeatures(hostingAdapter: HostingAdapter) {
    if (hostingAdapter?.provider && hostingAdapter?.config) {
      const adapter = this.adapters[hostingAdapter.provider];

      return adapter.fetchFeatures(hostingAdapter.config);
    }
    console.log("No Adapter");
    return Promise.resolve(false);
  }
}
