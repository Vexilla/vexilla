import { BlobServiceClient } from "@azure/storage-blob";
import axios from "axios";
import { HostingConfigBase } from "../types";

export interface HostingConfigAzure extends HostingConfigBase {
  provider: "azure";
  providerType: "direct";
  remoteUrl: string;
  storageAccount: string;
  container: string;
  sharedAccessSignature: string;
}

export class AzureAdapter {
  static fetchFeatures(config: HostingConfigAzure) {
    const fileUrl = `${config.remoteUrl}features.json`;

    return axios.get(fileUrl).catch((error) => {
      console.log("Error fetching Features");
      return "foo";
    });
  }

  static isConfigValid(config: HostingConfigAzure) {
    return !(
      !config.remoteUrl ||
      !config.container ||
      !config.storageAccount ||
      !config.sharedAccessSignature
    );
  }

  static async upload(payload: any, config: HostingConfigAzure) {
    const blobClient = new BlobServiceClient(config.sharedAccessSignature);

    const containerClient = blobClient.getContainerClient(config.container);

    const blockBlobClient = containerClient.getBlockBlobClient("features.json");
    const str = JSON.stringify(payload);
    const buf = new ArrayBuffer(str.length); // 2 bytes for each char
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return blockBlobClient.uploadData(buf);
  }
}
