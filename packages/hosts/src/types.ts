import { HostingStatusType } from "./enums";
import { HostingConfigS3 } from "./hosting-adapters/s3.adapter";
import { HostingConfigAzure } from "./hosting-adapters/azure.adapter";
import { HostingConfigGcloud } from "./hosting-adapters/gcloud.adapter";
import { HostingConfigFirebase } from "./hosting-adapters/firebase.adapter";

export type HostingProvider = "s3" | "azure" | "gcloud" | "firebase" | null;

export type HostingConfig =
  | (HostingConfigS3 &
      HostingConfigAzure &
      HostingConfigGcloud &
      HostingConfigFirebase)
  | null;

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
