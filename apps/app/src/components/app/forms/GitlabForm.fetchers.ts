import { config } from "../../../stores/config-valtio";
import type {
  AppState,
  HostingConfig,
  HostingConfigGitLab,
} from "../../../types";
import {
  GitFetcher,
  GitReadError,
  hasValue,
  decodeBase64Text,
  gitLocationKey,
} from "../../../utils/fetcher";
import { README_CONTENTS } from "../../../utils/repo-init";
import type {
  GitLabRepositoryTreeResponse,
  GitLabBranch,
  GitLabCreateCommitActionOptions,
  GitLabGetProjectsResponse,
  GitLabRepositoryFileResponse,
} from "./GitlabForm.types";

const DEFAULT_GITLAB_BASE_URL = "https://gitlab.com";
const MAX_PAGES = 1000;
type Context = Readonly<HostingConfigGitLab>;
type FileToPublish = { content: string; filePath: string };

function getGitLabBaseUrl(baseUrl = DEFAULT_GITLAB_BASE_URL) {
  return `${baseUrl.trim() || DEFAULT_GITLAB_BASE_URL}/api/v4`;
}

export function hasGitLabAuthentication(
  hosting: HostingConfig
): hosting is HostingConfigGitLab {
  return (
    hosting.provider === "gitlab" &&
    hosting.providerType === "git" &&
    hasValue(hosting.accessToken)
  );
}

export function hasGitLabRepository(hosting: HostingConfig) {
  return (
    hasGitLabAuthentication(hosting) &&
    hasValue(hosting.repositoryId) &&
    hasValue(hosting.owner) &&
    hasValue(hosting.repositoryName)
  );
}

export function gitlabDiscoveryKey(hosting: HostingConfig) {
  return JSON.stringify(
    hasGitLabAuthentication(hosting)
      ? [
          hosting.provider,
          hosting.accessToken,
          getGitLabBaseUrl(hosting.baseUrl),
        ]
      : [hosting.provider, hosting.providerType]
  );
}

export class GitLabFetcher extends GitFetcher {
  private readonly baselineHeads = new Map<string, string>();

  private rememberReadHead(context: Context, head: string) {
    if (
      this.getReadContextKey(context) === this.getReadContextKey(config.hosting)
    ) {
      this.baselineHeads.set(gitLocationKey(context), head);
    }
  }

  isRepositoryReady(hosting: HostingConfig) {
    return hasGitLabRepository(hosting);
  }

  isConfigReady(hosting: HostingConfig) {
    return (
      hasGitLabAuthentication(hosting) &&
      hasGitLabRepository(hosting) &&
      hasValue(hosting.targetBranch)
    );
  }

  private captureRepository(): Context {
    const context = { ...config.hosting };
    if (!hasGitLabAuthentication(context) || !hasGitLabRepository(context)) {
      throw new GitReadError("GitLab repository selection is incomplete");
    }
    return context;
  }

  private projectPath(context: Context) {
    return `/projects/${encodeURIComponent(context.repositoryId)}`;
  }

  async fetchBranches() {
    const context = this.captureRepository();
    return this.fetchAll<GitLabBranch>(
      `${this.projectPath(context)}/repository/branches`,
      context
    );
  }

  async fetchRepositories(): Promise<GitLabGetProjectsResponse> {
    const context = { ...config.hosting };
    if (!hasGitLabAuthentication(context)) {
      throw new GitReadError("GitLab authentication is incomplete");
    }
    return this.fetchAll<GitLabGetProjectsResponse[number]>(
      "/projects?simple=true&membership=true",
      context
    );
  }

  private async fetchAll<T>(path: string, context: Context): Promise<T[]> {
    const values: T[] = [];
    const seen = new Set<string>();
    let page = 1;
    for (let count = 0; count < MAX_PAGES; count++) {
      const response = await this.request(
        `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
        context
      );
      const entries: T[] = await response.json();
      if (!Array.isArray(entries)) {
        throw new GitReadError("Invalid GitLab collection response");
      }
      const fingerprint = JSON.stringify(entries);
      if (seen.has(fingerprint)) {
        throw new GitReadError("Repeated GitLab pagination page");
      }
      seen.add(fingerprint);
      values.push(...entries);
      const next = response.headers.get("X-Next-Page");
      if (next === "" || (next === null && entries.length < 100)) {
        return values;
      }
      const nextPage = next === null ? page + 1 : Number(next);
      if (
        !Number.isSafeInteger(nextPage) ||
        nextPage <= page ||
        entries.length === 0
      ) {
        throw new GitReadError("Invalid GitLab pagination");
      }
      page = nextPage;
    }
    throw new GitReadError("GitLab pagination limit exceeded");
  }

  async fetchBranch(
    branchName: string,
    context: Context = this.captureRepository()
  ) {
    if (!hasValue(branchName)) {
      throw new GitReadError("GitLab branch selection is incomplete");
    }
    const branch = await this.getRequest<GitLabBranch>(
      `${this.projectPath(context)}/repository/branches/${encodeURIComponent(
        branchName
      )}`,
      context
    );
    if (!hasValue(branch.commit?.id)) {
      throw new GitReadError("Invalid GitLab branch response");
    }
    return branch;
  }

  private fetchFile(fileName: string, ref: string, context: Context) {
    return this.getRequest<GitLabRepositoryFileResponse>(
      `${this.projectPath(context)}/repository/files/${encodeURIComponent(
        fileName
      )}?ref=${encodeURIComponent(ref)}`,
      context
    );
  }

  async getCurrentConfig(): Promise<AppState | null> {
    const context = this.captureRepository();
    if (!hasValue(context.targetBranch)) {
      throw new GitReadError("GitLab config selection is incomplete");
    }
    const branch = await this.fetchBranch(context.targetBranch, context);
    let file: GitLabRepositoryFileResponse;
    try {
      file = await this.fetchFile("config.json", branch.commit.id, context);
    } catch (error) {
      // The captured commit was verified above; only a missing file is absence.
      if (error instanceof GitReadError && error.status === 404) {
        this.rememberReadHead(context, branch.commit.id);
        return null;
      }
      throw error;
    }
    const result = JSON.parse(
      file.encoding === "base64" ? decodeBase64Text(file.content) : file.content
    );
    if (
      !result ||
      typeof result !== "object" ||
      !Array.isArray(result.groups) ||
      !result.hosting ||
      typeof result.hosting !== "object" ||
      Array.isArray(result.hosting) ||
      !Number.isFinite(result.modifiedAt)
    ) {
      throw new GitReadError("Invalid GitLab config document");
    }
    this.rememberReadHead(context, branch.commit.id);
    return result;
  }

  async isBranchValid(branchName: string) {
    if (!hasGitLabRepository(config.hosting) || !hasValue(branchName)) {
      return false;
    }
    const context = this.captureRepository();
    try {
      const entries = await this.getRequest<GitLabRepositoryTreeResponse>(
        `${this.projectPath(context)}/repository/tree?ref=${encodeURIComponent(
          branchName
        )}&per_page=1`,
        context
      );
      if (!Array.isArray(entries)) {
        throw new GitReadError("Invalid GitLab tree response");
      }
      return entries.length > 0;
    } catch (error) {
      if (error instanceof GitReadError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async createBranch(newBranchName: string, head: string) {
    const context = this.captureRepository();
    if (!hasValue(newBranchName) || !hasValue(head)) {
      throw new GitReadError("GitLab branch selection is incomplete");
    }
    return this.payloadRequest(
      `${this.projectPath(context)}/repository/branches`,
      { branch: newBranchName, ref: head },
      context
    );
  }

  async initializeBranch(branchName: string) {
    const context = this.captureRepository();
    if (!hasValue(branchName)) {
      throw new GitReadError("GitLab branch selection is incomplete");
    }
    await this.createCommit(
      branchName,
      [{ action: "create", file_path: "README.md", content: README_CONTENTS }],
      context
    );
  }

  async publish(branchName: string, files: FileToPublish[]) {
    const context = this.captureRepository();
    if (!hasValue(branchName)) {
      throw new GitReadError("GitLab branch selection is incomplete");
    }
    const expectedHead = this.baselineHeads.get(
      gitLocationKey({ ...context, targetBranch: branchName })
    );
    const pendingFiles = files.map((file) => ({ ...file }));
    const branch = await this.fetchBranch(branchName, context);
    if (expectedHead && branch.commit.id !== expectedHead) {
      throw new GitReadError(
        "The GitLab branch changed since the last read. Refresh and merge before publishing.",
        409
      );
    }
    const actions = await Promise.all(
      pendingFiles.map(
        async (file): Promise<GitLabCreateCommitActionOptions> => {
          let existing: GitLabRepositoryFileResponse | undefined;
          try {
            existing = await this.fetchFile(
              file.filePath,
              branch.commit.id,
              context
            );
          } catch (error) {
            if (!(error instanceof GitReadError && error.status === 404)) {
              throw error;
            }
          }
          return {
            action: existing ? "update" : "create",
            file_path: file.filePath,
            content: file.content,
            encoding: "text",
            ...(hasValue(existing?.last_commit_id)
              ? { last_commit_id: existing.last_commit_id }
              : {}),
          };
        }
      )
    );
    if (context.shouldCreatePullRequest) {
      const newBranchName = `${context.branchNamePrefix}${Date.now()}`;
      await this.createCommit(
        newBranchName,
        actions,
        context,
        branch.commit.id
      );
      await this.payloadRequest(
        `${this.projectPath(context)}/merge_requests`,
        {
          title: "Update Vexilla feature flags",
          target_branch: branchName,
          source_branch: newBranchName,
          allow_collaboration: true,
          description: "This PR was generated by Vexilla.",
        },
        context
      );
    } else {
      await this.createCommit(branchName, actions, context);
    }
  }

  private createCommit(
    branch: string,
    actions: GitLabCreateCommitActionOptions[],
    context: Context,
    startSha?: string
  ) {
    return this.payloadRequest(
      `${this.projectPath(context)}/repository/commits`,
      {
        branch,
        commit_message: "chore: update Vexilla feature flags",
        actions,
        ...(startSha ? { start_sha: startSha } : {}),
      },
      context
    );
  }

  private async request(
    path: string,
    context: Context,
    payload?: Record<string, unknown>
  ) {
    const response = await fetch(
      `${getGitLabBaseUrl(context.baseUrl)}${path}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${context.accessToken}`,
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        ...(payload ? { method: "POST", body: JSON.stringify(payload) } : {}),
      }
    );
    if (!response.ok) {
      throw new GitReadError(
        `GitLab ${payload ? "write" : "read"} failed (${response.status})`,
        response.status
      );
    }
    return response;
  }

  private async getRequest<T>(path: string, context: Context): Promise<T> {
    return (await this.request(path, context)).json();
  }

  private async payloadRequest(
    path: string,
    payload: Record<string, unknown>,
    context: Context
  ) {
    const response = await this.request(path, context, payload);
    const body = await response.text();
    return body ? JSON.parse(body) : undefined;
  }
}
