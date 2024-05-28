import { HostingConfigBase } from "../../types";

export interface HostingConfigGcloud extends HostingConfigBase {
  provider: "gcloud";
  providerType: "direct";
  bucket: string;
  accessKey: string;
  secretAccessKey: string;
}

export class GcloudAdapter {
  static fetchFeatures(_config: HostingConfigGcloud) {
    throw new Error("fetchFeatures not implemented");
  }
  static isConfigValid(_config: HostingConfigGcloud) {
    throw new Error("isConfigValid is not implemented.");
  }
  static async upload(_payload: any, _config: HostingConfigGcloud) {
    throw new Error("Gcloud upload not implemented");
  }
}
