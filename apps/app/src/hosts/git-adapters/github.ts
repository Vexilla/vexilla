import { HostingConfigGitBase } from "../../types";

export interface HostingConfigGithub extends HostingConfigGitBase {
  provider: "github";
  providerType: "git";
  installationId: string;
  repositoryName: string;
  owner: string;
}

export const GitHubAdapter = {
  async fetchFeatures(_config: HostingConfigGithub) {
    // const fileUrl = `https://${config.bucketName}.s3.amazonaws.com/features.json`;
    // return axios.get(fileUrl).catch((error) => {
    //   console.log("Error fetching Features");
    //   return "foo";
    // });
    return false;
  },

  isConfigValid(config: HostingConfigGithub) {
    return !(!config.installationId || !config.accessToken);
  },

  async publish(_config: HostingConfigGithub, _payload: any) {},

  async getRepos(_config: HostingConfigGithub) {
    return false;
  },
} as const;
