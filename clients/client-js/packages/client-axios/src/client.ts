import axios from "axios";
import { VexillaClient } from "@vexilla/client";

export class VexillaAxiosClient extends VexillaClient {
  async getFlags(fileName: string) {
    const flagsResponse: any = await super.getFlags(
      `${super.baseUrl}/${fileName}`,
      (url: string) => {
        return axios.get(url);
      }
    );
    return flagsResponse.data;
  }
}
