import { config } from "../../../stores/config-valtio";
import { AppState, HostingConfigGitBase } from "../../../types";
import { GitFetcher } from "../../../utils/fetcher";
import { README_CONTENTS } from "../../../utils/repo-init";
import {
  GitLabRepositoryTreeResponse,
  GitLabBranch,
  GitLabCreateBranchOptions,
  GitLabCreateMergeRequestResponse,
  GitLabCommit,
  GitLabCreateCommitOptions,
  GitLabCreateCommitActionOptions,
  GitLabCreateMergeRequestOptions,
  GitLabGetProjectsResponse,
  GitLabRepositoryFileResponse,
} from "./GitlabForm.types";
import { cloneDeep } from "lodash-es";

const DEFAULT_GITLAB_BASE_URL = `https://gitlab.com`;

function getGitLabBaseUrl(baseUrl = DEFAULT_GITLAB_BASE_URL) {
  if (baseUrl.trim() === "") {
    baseUrl = DEFAULT_GITLAB_BASE_URL;
  }
  return `${baseUrl}/api/v4`;
}

const commonHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitLab-Api-Version": "2022-11-28",
};

export class GitLabFetcher extends GitFetcher {
  // private async fetchInstallations() {
  //   if (config.hosting.provider === "gitlab") {
  //     return this.getRequest<GitLabGetInstallationsResponse>(
  //       `/user/installations`
  //     );
  //   } else {
  //     throw new Error(
  //       "GitlabFetcher.fetchBranches() called on non-gitlab config"
  //     );
  //   }
  // }

  async fetchBranches() {
    if (config.hosting.provider === "gitlab") {
      return this.getRequest<GitLabBranch[]>(
        `/projects/${config.hosting.repositoryId}/repository/branches/`
      );
    } else {
      throw new Error(
        "GitlabFetcher.fetchBranches() called on non-gitlab config"
      );
    }
  }

  async fetchRepositories() {
    return this.getRequest<GitLabGetProjectsResponse>(
      `/projects?simple=true&membership=true`
    );
  }

  private async fetchBranch(branchName: string) {
    if (config.hosting.provider === "gitlab") {
      return this.getRequest<GitLabBranch>(
        `/repos/${config.hosting.owner}/${config.hosting.repositoryName}/branches/${branchName}`
      );
    } else {
      throw new Error(
        "GitlabFetcher.fetchBranch() called on non-gitlab config"
      );
    }
  }

  private async fetchTree(branchName?: string) {
    if (config.hosting.provider === "gitlab") {
      let url = `/projects/${config.hosting.repositoryId}/repository/tree?ref=${branchName}`;

      return this.getRequest<GitLabRepositoryTreeResponse>(url).catch(() => []);
    } else {
      throw new Error("GitlabFetcher.fetchTree() called on non-gitlab config");
    }
  }

  private async fetchFile(fileName: string, branchName?: string) {
    if (config.hosting.provider === "gitlab") {
      return this.getRequest<GitLabRepositoryFileResponse>(
        `/projects/${config.hosting.repositoryId}/repository/files/${fileName}${
          Boolean(branchName?.trim())
            ? `?ref=${encodeURIComponent(branchName?.trim() || "")}`
            : ""
        }`
      );
    } else {
      throw new Error("GitlabFetcher.fetchFile() called on non-gitlab config");
    }
  }

  private async createBranch(newBranchName: string, head: string) {
    if (config.hosting.provider === "gitlab") {
      return this.payloadRequest<GitLabBranch>(
        `/projects/${config.hosting.repositoryId}/repository/branches`,
        {
          branch: newBranchName,
          ref: head,
        } as GitLabCreateBranchOptions
      );
    } else {
      throw new Error(
        "GitlabFetcher.createBranch() called on non-gitlab config"
      );
    }
  }

  private async createCommit(
    targetBranchName: string,
    files: GitLabCreateCommitActionOptions[],
    newBranchName?: string
  ) {
    if (config.hosting.provider === "gitlab") {
      let payload = {
        branch: targetBranchName,
        commit_message: "chore: update Vexilla feature flags",
        actions: files,
      } as GitLabCreateCommitOptions;

      if (Boolean(newBranchName)) {
        payload = {
          branch: newBranchName,
          commit_message: "chore: update Vexilla feature flags",
          actions: files,
          start_branch: targetBranchName,
        } as GitLabCreateCommitOptions;
      }

      return this.payloadRequest<GitLabCommit>(
        `/projects/${config.hosting.repositoryId}/repository/commits`,
        payload
      );
    } else {
      throw new Error(
        "GitlabFetcher.createCommit() called on non-gitlab config"
      );
    }
  }

  // private async updateBranch(branchName: string, commitSha: string) {
  //   if (config.hosting.provider === "gitlab") {
  //     return this.payloadRequest<GitLabBranch>(
  //       `/repos/${config.hosting.owner}/${config.hosting.repositoryName}/git/refs/heads/${branchName}`,
  //       {
  //         sha: commitSha,
  //       },
  //       "PATCH"
  //     );
  //   } else {
  //     throw new Error(
  //       "GitlabFetcher.updateBranch() called on non-gitlab config"
  //     );
  //   }
  // }

  private async createMergeRequest(
    branchName: string,
    baseBranchName: string,
    description = ""
  ) {
    if (config.hosting.provider === "gitlab") {
      return this.payloadRequest<GitLabCreateMergeRequestResponse>(
        `/projects/${config.hosting.repositoryId}/merge_requests`,
        {
          title: "Update Vexilla feature flags",
          target_branch: baseBranchName,
          source_branch: branchName,
          allow_collaboration: true,
          description: `
${description}
This PR was generated by Vexilla.
        `,
        } as GitLabCreateMergeRequestOptions
      );
    } else {
      throw new Error(
        "GitlabFetcher.createPullRequest() called on non-gitlab config"
      );
    }
  }

  async getCurrentConfig() {
    if (config.hosting.provider === "gitlab") {
      return this.fetchFile("config%2Ejson", config.hosting.targetBranch)
        .then((response) => {
          return JSON.parse(response.content);
        })
        .catch(() => {
          return cloneDeep(config);
        });
    } else {
      throw new Error(
        "GitlabFetcher.getCurrentConfig() called on non-gitlab config"
      );
    }
  }

  async isBranchValid(branchName: string) {
    if (config.hosting.provider === "gitlab") {
      const result = await this.fetchTree(branchName)
        .then((files) => {
          return files.length > 0;
        })
        .catch(() => false);

      return result;
    } else {
      throw new Error(
        "GitlabFetcher.isBranchValid() called on non-gitlab config"
      );
    }
  }

  async initializeBranch(branchName: string) {
    await this.createCommit(branchName, [
      {
        action: "create",
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
      config.hosting.provider === "gitlab"
    ) {
      if (config.hosting.shouldCreatePullRequest) {
        this.publishPullRequest(branchName, files);
      } else {
        this.publishDirectly(branchName, files);
      }
    } else {
      throw new Error("GitlabFetcher.publish() called on non-gitlab config");
    }
  }

  private async publishDirectly(
    branchName: string,
    files: {
      content: string;
      filePath: string;
    }[]
  ) {
    try {
      const tree = await this.fetchTree(branchName);

      const mappedFiles: GitLabCreateCommitActionOptions[] = files.map(
        (file) => {
          const action = Boolean(
            tree?.find((blob) => blob.path === file.filePath)?.id
          )
            ? "create"
            : "update";

          return {
            action,
            file_path: file.filePath,
            content: file.content,
            encoding: "text",
          };
        }
      );

      // createCommit
      await this.createCommit(branchName, mappedFiles);
    } catch (e: any) {
      console.log({ e });
      throw new Error("Failed to publish directly.");
    }
  }

  private async publishPullRequest(
    baseBranch: string,
    files: {
      content: string;
      filePath: string;
    }[],
    description = ""
  ) {
    try {
      // check if files exist and determine createCommit actions
      const tree = await this.fetchTree(baseBranch);

      const mappedFiles: GitLabCreateCommitActionOptions[] = files.map(
        (file) => {
          const action = Boolean(
            tree?.find((blob) => blob.path === file.filePath)?.id
          )
            ? "update"
            : "create";

          return {
            action,
            file_path: file.filePath,
            content: file.content,
            encoding: "text",
          };
        }
      );

      // create branch
      const gitHosting = config.hosting as HostingConfigGitBase;
      const newBranchName = `${gitHosting.branchNamePrefix}${Date.now()}`;

      await this.createCommit(baseBranch, mappedFiles, newBranchName);

      await this.createMergeRequest(newBranchName, baseBranch, description);
    } catch (e: any) {
      console.log({ e });
      throw new Error("Failed to publish pull request.");
    }
  }

  private async getRequest<T>(path: string) {
    if (config.hosting.provider === "gitlab") {
      const Authorization = `Bearer ${config.hosting.accessToken}`;

      const url = `${getGitLabBaseUrl(config.hosting.baseUrl)}${path}`;

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
        "GitlabFetcher.createPullRequest() called on non-gitlab config"
      );
    }
  }

  private async payloadRequest<T>(
    path: string,
    payload: Record<string, any>,
    method: "POST" | "PUT" | "PATCH" | "QUERY" = "POST"
  ) {
    if (config.hosting.provider === "gitlab") {
      const Authorization = `Bearer ${config.hosting.accessToken}`;

      const url = `${getGitLabBaseUrl(config.hosting.baseUrl)}${path}`;

      const response = await fetch(url, {
        headers: {
          ...commonHeaders,
          Authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        method,
      });

      const responseBody: T = await response.json();

      if (
        (response.status < 200 || response.status > 299) &&
        response.status !== 404
      ) {
        console.log(`Error sending to ${url}`, responseBody);
        throw new Error(`Error sending to ${url}`);
      } else {
        return responseBody;
      }
    } else {
      throw new Error(
        "GitlabFetcher.createPullRequest() called on non-gitlab config"
      );
    }
  }
}
