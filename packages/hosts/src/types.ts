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
