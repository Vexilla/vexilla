import { z } from "zod";

import type { HostingStatusType } from "./hosts/enums";
import type { HostingConfigS3 } from "./hosts/hosting-adapters/s3.adapter";
import type { HostingConfigAzure } from "./hosts/hosting-adapters/azure.adapter";
import type { HostingConfigGcloud } from "./hosts/hosting-adapters/gcloud.adapter";
import type { HostingConfigFirebase } from "./hosts/hosting-adapters/firebase.adapter";
import type { HostingConfigGithub } from "./hosts/git-adapters/github";
import type { Group } from "@vexilla/types";

export interface AppState {
  modifiedAt: number;
  groups: Group[];
  hosting: HostingConfig;
}

export const HostingProviderValidator = z.enum([
  // git providers
  "github",
  // | "bitbucket",
  // direct providers
  "azure",
  "gcloud",
  "firebase",
  "s3",
]);

export const HostingProviderTypeValidator = z.enum(["git", "direct"]);

export type HostingProvider = z.infer<typeof HostingProviderValidator> | "";

export type HostingProviderType =
  | z.infer<typeof HostingProviderTypeValidator>
  | "";

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
  | HostingConfigAzure
  | HostingConfigGcloud
  | HostingConfigFirebase
  | HostingConfigGithub;

export interface HostingStatus {
  message: string;
  extraDetails?: string;
  route?: string;
  type: HostingStatusType;
}

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
