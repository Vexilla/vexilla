// import { S3Client, S3ClientConfig, PutObjectCommand } from "@aws-sdk/client-s3";
import { HostingConfigBase } from "../types";

import { S3 } from "aws-sdk";
import axios from "axios";

export interface HostingConfigS3 extends HostingConfigBase {
  provider: "s3";
  providerType: "direct";
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export class S3Adapter {
  static fetchFeatures(config: HostingConfigS3) {
    const fileUrl = `https://${config.bucketName}.s3.amazonaws.com/features.json`;

    return axios.get(fileUrl).catch((error) => {
      console.log("Error fetching Features");
      return "foo";
    });
  }

  static isConfigValid(config: HostingConfigS3) {
    return !(
      !config.region ||
      !config.bucketName ||
      !config.accessKeyId ||
      !config.secretAccessKey
    );
  }

  static async upload(payload: any, config: HostingConfigS3) {
    return this.uploadWithOldSDK(payload, config);
  }

  private static async uploadWithOldSDK(payload: any, config: HostingConfigS3) {
    const s3 = new S3({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    const params = {
      ACL: "public-read",
      Body: JSON.stringify(payload),
      Bucket: config.bucketName,
      Key: "features.json",
    };
    const data = await s3
      .putObject(params)
      .promise()
      .catch((err: any) => {
        console.log(err, err.stack);
      });
    console.log("Success: ", data);
    return data;
  }

  // private static async uploadWithNewSDK(payload: any, config: HostingConfigS3) {
  //   const client = new S3Client({
  //     // ...config,
  //     region: config.region,
  //     credentials: {
  //       accessKeyId: config.accessKeyId,
  //       secretAccessKey: config.secretAccessKey,
  //     },
  //     // signatureVersion: 'v4',
  //   });
  //   const command = new PutObjectCommand({
  //     Bucket: config.bucketName,
  //     Body: JSON.stringify(payload),
  //     Key: "testing.json",
  //     ACL: "public-read",
  //     // ContentType: "application/json",
  //   });
  //   console.log("payload", JSON.stringify(payload));
  //   return client.send(command);
  // }
}
