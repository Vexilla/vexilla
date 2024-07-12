import { config } from "../../../stores/config-valtio";
import { HostingConfigGitBase } from "../../../types";
import { GitFetcher } from "../../../utils/fetcher";
import { README_CONTENTS } from "../../../utils/repo-init";
import {
  BitbucketGetWorkspacesResponse,
  BitbucketGetRepositoriesResponse,
  BitbucketGetBranchesResponse,
  BitbucketGetBranchResponse,
  BitbucketGetTreeResponse,
  BitbucketCreateCommitActionOptions,
} from "./BitbucketForm.types";
import { cloneDeep } from "lodash-es";

const DEFAULT_GITLAB_BASE_URL = `https://api.bitbucket.org`;

function getBitbucketBaseUrl(baseUrl = DEFAULT_GITLAB_BASE_URL) {
  if (baseUrl.trim() === "") {
    baseUrl = DEFAULT_GITLAB_BASE_URL;
  }
  return `${baseUrl}/2.0`;
}

const commonHeaders = {
  Accept: "application/vnd.github+json",
  // "X-Bitbucket-Api-Version": "2022-11-28",
};

export class BitbucketFetcher extends GitFetcher {
  // private async fetchInstallations() {
  //   if (config.hosting.provider === "bitbucket") {
  //     return this.getRequest<BitbucketGetInstallationsResponse>(
  //       `/user/installations`
  //     );
  //   } else {
  //     throw new Error(
  //       "BitbucketFetcher.fetchBranches() called on non-bitbucket config"
  //     );
  //   }
  // }

  async fetchWorkspaces() {
    if (config.hosting.provider === "bitbucket") {
      return this.getRequest<BitbucketGetWorkspacesResponse>(
        `/user/permissions/workspaces`
      );
    } else {
      throw new Error(
        "BitbucketFetcher.fetchWorkspaces() called on non-bitbucket config"
      );
    }
  }

  async fetchBranches() {
    if (config.hosting.provider === "bitbucket") {
      return this.getRequest<BitbucketGetBranchesResponse>(
        `/repositories/${config.hosting.workspaceId}/${config.hosting.repositoryId}/refs/branches`
      ).then((result) => {
        return result.values;
      });
    } else {
      throw new Error(
        "BitbucketFetcher.fetchBranches() called on non-bitbucket config"
      );
    }
  }

  async fetchRepositories() {
    if (config.hosting.provider === "bitbucket") {
      return this.getRequest<BitbucketGetRepositoriesResponse>(
        `/repositories/${config.hosting.workspaceId}`
      );
    } else {
      throw new Error(
        "BitbucketFetcher.fetchRepositories() called on non-bitbucket config"
      );
    }
  }

  private async fetchBranch() {
    if (config.hosting.provider === "bitbucket") {
      return this.getRequest<BitbucketGetBranchResponse>(
        `/repositories/${config.hosting.workspaceId}/${config.hosting.repositoryName}/refs/branches/${config.hosting.targetBranch}`
      );
    } else {
      throw new Error(
        "BitbucketFetcher.fetchBranch() called on non-bitbucket config"
      );
    }
  }

  private async fetchTree() {
    if (config.hosting.provider === "bitbucket") {
      const branchResponse = await this.fetchBranch();

      return this.getRequest<BitbucketGetTreeResponse>(
        `/repositories/${config.hosting.workspaceId}/${config.hosting.repositoryId}/src/${branchResponse.target.hash}/`
      )
        .then((response) => response.values)
        .catch(() => []);
    } else {
      throw new Error(
        "BitbucketFetcher.fetchTree() called on non-bitbucket config"
      );
    }
  }

  private async fetchFile(fileName: string) {
    if (config.hosting.provider === "bitbucket") {
      const branchResponse = await this.fetchBranch();
      return this.getRequest<string>(
        `/repositories/${config.hosting.workspaceId}/${config.hosting.repositoryId}/src/${branchResponse.target.hash}/${fileName}`
      );
    } else {
      throw new Error(
        "BitbucketFetcher.fetchFile() called on non-bitbucket config"
      );
    }
  }

  private async createCommit(
    files: BitbucketCreateCommitActionOptions[],
    newBranchName?: string
  ) {
    if (config.hosting.provider === "bitbucket") {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append(
          "files",
          new Blob([file.content], { type: "text/plain" }),
          file.file_path
        );
      });

      formData.append("message", "chore: update Vexilla feature flags");

      // const searchParams = new URLSearchParams({
      //   message: "chore: update Vexilla feature flags",
      // });

      if (newBranchName) {
        formData.append("branch", newBranchName);
      }

      return this.payloadRequest(
        `/repositories/${config.hosting.workspaceId}/${config.hosting.repositoryId}/src`,
        formData
      );
    } else {
      throw new Error(
        "BitbucketFetcher.createCommit() called on non-bitbucket config"
      );
    }
  }

  private async createMergeRequest(branchName: string, description = "") {
    if (config.hosting.provider === "bitbucket") {
      return this.payloadRequest(
        `/projects/${config.hosting.repositoryId}/merge_requests`,
        JSON.stringify({
          title: "Update Vexilla feature flags",
          destination: {
            branch: {
              name: config.hosting.targetBranch,
            },
          },
          source: {
            branch: { name: branchName },
          },
          summary: {
            raw: `
  ${description}
  This PR was generated by Vexilla.
          `,
          },
        })
      );
    } else {
      throw new Error(
        "BitbucketFetcher.createPullRequest() called on non-bitbucket config"
      );
    }
  }

  async getCurrentConfig() {
    if (config.hosting.provider === "bitbucket") {
      return this.fetchFile("config%2Ejson")
        .then((response) => {
          return JSON.parse(response);
        })
        .catch(() => {
          return cloneDeep(config);
        });
    } else {
      throw new Error(
        "BitbucketFetcher.getCurrentConfig() called on non-bitbucket config"
      );
    }
  }

  async isBranchValid(_branchName: string) {
    if (config.hosting.provider === "bitbucket") {
      const result = await this.fetchTree()
        .then((files) => {
          return files.length > 0;
        })
        .catch(() => false);

      return result;
    } else {
      throw new Error(
        "BitbucketFetcher.isBranchValid() called on non-bitbucket config"
      );
    }
  }

  async initializeBranch(_branchName: string) {
    await this.createCommit([
      {
        file_path: "README.md",
        content: README_CONTENTS,
      },
    ]);
  }

  async publish(
    branchName: string,
    files: {
      content: string;
      filePath: string;
    }[]
  ) {
    if (
      config.hosting.providerType === "git" &&
      config.hosting.provider === "bitbucket"
    ) {
      if (config.hosting.shouldCreatePullRequest) {
        this.publishPullRequest(branchName, files);
      } else {
        this.publishDirectly(branchName, files);
      }
    } else {
      throw new Error(
        "BitbucketFetcher.publish() called on non-bitbucket config"
      );
    }
  }

  private async publishDirectly(
    _branchName: string,
    files: {
      content: string;
      filePath: string;
    }[]
  ) {
    try {
      const mappedFiles: BitbucketCreateCommitActionOptions[] = files.map(
        (file) => {
          return {
            file_path: file.filePath,
            content: file.content,
          };
        }
      );

      // createCommit
      await this.createCommit(mappedFiles);
    } catch (e: any) {
      console.log({ e });
      throw new Error("Failed to publish directly.");
    }
  }

  private async publishPullRequest(
    _baseBranch: string,
    files: {
      content: string;
      filePath: string;
    }[],
    description = ""
  ) {
    try {
      // check if files exist and determine createCommit actions

      const mappedFiles: BitbucketCreateCommitActionOptions[] = files.map(
        (file) => {
          return {
            file_path: file.filePath,
            content: file.content,
          };
        }
      );

      // create branch
      const gitHosting = config.hosting as HostingConfigGitBase;
      const newBranchName = `${gitHosting.branchNamePrefix}${Date.now()}`;

      await this.createCommit(mappedFiles, newBranchName);

      await this.createMergeRequest(newBranchName, description);
    } catch (e: any) {
      console.log({ e });
      throw new Error("Failed to publish pull request.");
    }
  }

  private async getRequest<T>(path: string) {
    if (config.hosting.provider === "bitbucket") {
      const Authorization = `Bearer ${config.hosting.accessToken}`;

      const url = `${getBitbucketBaseUrl(config.hosting.baseUrl)}${path}`;

      const response = await fetch(url, {
        headers: {
          ...commonHeaders,
          Authorization,
        },
      });

      const responseBody: T = await response.json();

      if (!response.ok) {
        console.log(`Error fetching ${url}`, responseBody);
        throw new Error(`Error fetching ${url}`);
      } else {
        return responseBody;
      }
    } else {
      throw new Error(
        "BitbucketFetcher.createPullRequest() called on non-bitbucket config"
      );
    }
  }

  private async payloadRequest(
    path: string,
    payload: BodyInit,
    method: "POST" | "PUT" | "PATCH" | "QUERY" = "POST"
  ) {
    if (config.hosting.provider === "bitbucket") {
      const Authorization = `Bearer ${config.hosting.accessToken}`;

      const url = `${getBitbucketBaseUrl(config.hosting.baseUrl)}${path}`;

      const headers: Record<string, string> = {
        ...commonHeaders,
        Authorization,
      };

      if (typeof payload === "string") {
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(url, {
        headers,
        body: payload,
        method,
      });

      if (
        (response.status < 200 || response.status > 299) &&
        response.status !== 404
      ) {
        throw new Error(`Error sending to ${url}`);
      } else if (response.headers.get("Content-Type") === "application/json") {
        const responseBody = await response.json();
        return responseBody;
      }
    } else {
      throw new Error(
        "BitbucketFetcher.createPullRequest() called on non-bitbucket config"
      );
    }
  }
}
