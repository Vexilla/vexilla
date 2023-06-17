import { HostingStatusType } from "./enums";
import { HostingConfigS3 } from "./hosting-adapters/s3.adapter";
import { HostingConfigAzure } from "./hosting-adapters/azure.adapter";
import { HostingConfigGcloud } from "./hosting-adapters/gcloud.adapter";
import { HostingConfigFirebase } from "./hosting-adapters/firebase.adapter";
import { HostingConfigGithub } from "./git-adapters/github";

export type HostingProvider =
  | ""
  // git providers
  | "github"
  // | "bitbucket"
  // direct providers
  // | "azure"
  // | "gcloud"
  // | "firebase"
  | "s3";

export type HostingProviderType = "" | "git" | "direct";

export interface HostingConfigBase {
  provider: HostingProvider;
  providerType: HostingProviderType;
}

export interface HostingConfigGitBase extends HostingConfigBase {
  accessToken: string;
  repositoryId: string;
  targetBranch: string;
  shouldCreatePullRequest: boolean;
  branchNamePrefix: string;
}

export interface HostingConfigEmpty extends HostingConfigBase {
  provider: "";
  providerType: "";
}

export type HostingConfig =
  | HostingConfigEmpty
  | HostingConfigS3
  // | HostingConfigAzure
  // | HostingConfigGcloud
  // | HostingConfigFirebase
  | HostingConfigGithub;

export interface HostingStatus {
  message: string;
  extraDetails?: string;
  route?: string;
  type: HostingStatusType;
}

export interface HostingBase {
  provider: HostingProvider;
  config: HostingConfig;
  status?: HostingStatus;
}

export interface HostingEmpty extends HostingBase {
  provider: "";
  config: HostingConfigEmpty;
}

export interface HostingS3 extends HostingBase {
  provider: "s3";
  config: HostingConfigS3;
}

export interface HostingGithub extends HostingBase {
  provider: "github";
  config: HostingConfigGithub;
}

// export interface HostingBitbucket extends HostingBase {
//   provider: "github";
//   config: HostingConfigBitbucket;
// }

export type Hosting = HostingEmpty | HostingS3 | HostingGithub;

export interface HostingAdapterBase {
  fetchFeatures: (config: HostingConfig) => Promise<any>;
  isConfigValid: (config: HostingConfig) => boolean;
  publish: (payload: any, config: HostingConfig) => Promise<void>;
}

export interface HostingAdapterDirect extends HostingAdapterBase {}

export interface HostingAdapterGit extends HostingAdapterBase {
  getRepos: (config: HostingConfigBase | HostingConfigGitBase) => Promise<any>;
}

export type HostingAdapter = HostingAdapterDirect | HostingAdapterGit;
