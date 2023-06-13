import { Readable } from "stream";
// import { Storage } from "@google-cloud/storage";
import axios from "axios";
import { HostingConfigBase } from "../types";

export interface HostingConfigFirebase extends HostingConfigBase {
  provider: "firebase";
  providerType: "direct";
  remoteUrl: string;
  bucketName: string;
  apiKey: string;
}

export class FirebaseAdapter {
  static fetchFeatures(config: HostingConfigFirebase) {
    // throw new Error("fetchFeatures not implemented");
  }
  static isConfigValid(config: HostingConfigFirebase) {
    // throw new Error("isConfigValid is not implemented.");
    return true;
  }
  static async upload(payload: any, config: HostingConfigFirebase) {
    const response = await axios
      .post(
        `https://storage.googleapis.com/upload/storage/v1/b/${config.bucketName}/o?name=features.json&uploadType=media&key=${config.apiKey}`,
        payload
      )
      .then((result) => {
        console.log({ result });
        return result;
      });

    // const storageClient = new Storage({
    //   credentials: JSON.parse(config.serviceAccountKeyJson),
    // });
    // const bucket = storageClient.bucket(config.bucketName);
    // const file = bucket.file("features.json");
    // return this.writeWritableStream(
    //   file.createWriteStream(),
    //   JSON.stringify(payload)
    // );
    // throw new Error("Firebase upload not implemented");
  }

  static writeWritableStream(
    writableStream: any,
    jsonString: string
  ): Promise<any> {
    return new Promise(function (resolve, reject) {
      console.log("made it into writeWriteable");
      Readable.from(jsonString)
        .pipe(writableStream as any)
        .on("error", (error: any) => {
          console.log("error in stream");
          reject(error);
        })
        .on("finish", () => {
          console.log("stream finished");
          resolve("success");
        });
    });
  }
}
