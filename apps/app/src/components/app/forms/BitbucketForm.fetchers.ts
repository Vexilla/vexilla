import { config } from "../../../stores/config-valtio";
import type {
  AppState,
  HostingConfig,
  HostingConfigBitbucket,
} from "../../../types";
import {
  GitFetcher,
  GitReadError,
  hasValue,
  gitReadContextKey,
  gitLocationKey,
} from "../../../utils/fetcher";
import { README_CONTENTS } from "../../../utils/repo-init";
import type {
  BitbucketGetWorkspacesResponse,
  BitbucketGetRepositoriesResponse,
  BitbucketGetBranchesResponse,
  BitbucketGetBranchResponse,
  BitbucketGetTreeResponse,
  BitbucketCreateCommitActionOptions,
} from "./BitbucketForm.types";

const DEFAULT_BITBUCKET_BASE_URL = "https://api.bitbucket.org";
const MAX_PAGES = 1000;
type Context = Readonly<HostingConfigBitbucket>;
type FileToPublish = { content: string; filePath: string };

function getBitbucketBaseUrl(baseUrl = DEFAULT_BITBUCKET_BASE_URL) {
  return `${baseUrl.trim() || DEFAULT_BITBUCKET_BASE_URL}/2.0`;
}

export function hasBitbucketAuthentication(
  hosting: HostingConfig
): hosting is HostingConfigBitbucket {
  return (
    hosting.provider === "bitbucket" &&
    hosting.providerType === "git" &&
    hasValue(hosting.accessToken)
  );
}

export function canDiscoverBitbucketRepositories(hosting: HostingConfig) {
  return hasBitbucketAuthentication(hosting) && hasValue(hosting.workspaceId);
}

export function hasBitbucketRepository(hosting: HostingConfig) {
  return (
    canDiscoverBitbucketRepositories(hosting) &&
    hasBitbucketAuthentication(hosting) &&
    hasValue(hosting.repositoryId) &&
    hasValue(hosting.owner) &&
    hasValue(hosting.repositoryName)
  );
}

export function bitbucketDiscoveryKey(hosting: HostingConfig) {
  return JSON.stringify(
    hasBitbucketAuthentication(hosting)
      ? [
          hosting.provider,
          hosting.accessToken,
          getBitbucketBaseUrl(hosting.baseUrl),
          hosting.workspaceId,
        ]
      : [hosting.provider, hosting.providerType]
  );
}

export class BitbucketFetcher extends GitFetcher {
  private readonly baselineHeads = new Map<string, string>();

  private rememberReadHead(context: Context, head: string) {
    if (
      this.getReadContextKey(context) === this.getReadContextKey(config.hosting)
    ) {
      this.baselineHeads.set(gitLocationKey(context), head);
    }
  }

  isRepositoryReady(hosting: HostingConfig) {
    return hasBitbucketRepository(hosting);
  }

  isConfigReady(hosting: HostingConfig) {
    return (
      hasBitbucketAuthentication(hosting) &&
      hasBitbucketRepository(hosting) &&
      hasValue(hosting.targetBranch)
    );
  }

  getReadContextKey(hosting: HostingConfig) {
    return JSON.stringify([
      gitReadContextKey(hosting),
      hosting.provider === "bitbucket" ? hosting.workspaceId : undefined,
    ]);
  }

  private captureRepository(): Context {
    const context = { ...config.hosting };
    if (
      !hasBitbucketAuthentication(context) ||
      !hasBitbucketRepository(context)
    ) {
      throw new GitReadError("Bitbucket repository selection is incomplete");
    }
    return context;
  }

  private repositoryPath(context: Context) {
    return `/repositories/${encodeURIComponent(
      context.workspaceId
    )}/${encodeURIComponent(context.repositoryId)}`;
  }

  async fetchWorkspaces() {
    const context = { ...config.hosting };
    if (!hasBitbucketAuthentication(context)) {
      throw new GitReadError("Bitbucket authentication is incomplete");
    }
    const values = await this.fetchAll<
      BitbucketGetWorkspacesResponse["values"][number]
    >("/user/permissions/workspaces", context);
    return { values };
  }

  async fetchRepositories() {
    const context = { ...config.hosting };
    if (
      !hasBitbucketAuthentication(context) ||
      !canDiscoverBitbucketRepositories(context)
    ) {
      throw new GitReadError("Bitbucket workspace selection is incomplete");
    }
    const values = await this.fetchAll<
      BitbucketGetRepositoriesResponse["values"][number]
    >(`/repositories/${encodeURIComponent(context.workspaceId)}`, context);
    return { values };
  }

  async fetchBranches() {
    const context = this.captureRepository();
    return this.fetchAll<BitbucketGetBranchesResponse["values"][number]>(
      `${this.repositoryPath(context)}/refs/branches`,
      context
    );
  }

  private async fetchAll<T>(path: string, context: Context): Promise<T[]> {
    const initial = new URL(`${getBitbucketBaseUrl(context.baseUrl)}${path}`);
    const values: T[] = [];
    const seenUrls = new Set<string>();
    const seenPages = new Set<string>();
    let query = "?pagelen=100";
    for (let count = 0; count < MAX_PAGES; count++) {
      if (seenUrls.has(query)) {
        throw new GitReadError("Repeated Bitbucket pagination link");
      }
      seenUrls.add(query);
      const page = await this.getRequest<{ values: T[]; next?: string }>(
        `${path}${query}`,
        context
      );
      if (!Array.isArray(page.values)) {
        throw new GitReadError("Invalid Bitbucket collection response");
      }
      const fingerprint = JSON.stringify(page.values);
      if (seenPages.has(fingerprint)) {
        throw new GitReadError("Repeated Bitbucket pagination page");
      }
      seenPages.add(fingerprint);
      values.push(...page.values);
      if (!page.next) {
        return values;
      }
      const next = new URL(page.next, initial);
      if (
        next.origin !== initial.origin ||
        next.pathname !== initial.pathname ||
        !next.search ||
        page.values.length === 0
      ) {
        throw new GitReadError("Invalid Bitbucket pagination link");
      }
      query = next.search;
    }
    throw new GitReadError("Bitbucket pagination limit exceeded");
  }

  private async fetchBranch(branchName: string, context: Context) {
    if (!hasValue(branchName)) {
      throw new GitReadError("Bitbucket branch selection is incomplete");
    }
    const branch = await this.getRequest<BitbucketGetBranchResponse>(
      `${this.repositoryPath(context)}/refs/branches/${encodeURIComponent(
        branchName
      )}`,
      context
    );
    if (!hasValue(branch.target?.hash)) {
      throw new GitReadError("Invalid Bitbucket branch response");
    }
    return branch;
  }

  async getCurrentConfig(): Promise<AppState | null> {
    const context = this.captureRepository();
    if (!hasValue(context.targetBranch)) {
      throw new GitReadError("Bitbucket config selection is incomplete");
    }
    const branch = await this.fetchBranch(context.targetBranch, context);
    let result: AppState;
    try {
      // Source files contain raw JSON; do not decode them a second time.
      result = await this.getRequest<AppState>(
        `${this.repositoryPath(context)}/src/${encodeURIComponent(
          branch.target.hash
        )}/config.json`,
        context
      );
    } catch (error) {
      // A missing file at the verified commit is an empty remote baseline.
      if (error instanceof GitReadError && error.status === 404) {
        this.rememberReadHead(context, branch.target.hash);
        return null;
      }
      throw error;
    }
    if (
      !result ||
      typeof result !== "object" ||
      !Array.isArray(result.groups) ||
      !result.hosting ||
      typeof result.hosting !== "object" ||
      Array.isArray(result.hosting) ||
      !Number.isFinite(result.modifiedAt)
    ) {
      throw new GitReadError("Invalid Bitbucket config document");
    }
    this.rememberReadHead(context, branch.target.hash);
    return result;
  }

  async isBranchValid(branchName: string) {
    if (!hasBitbucketRepository(config.hosting) || !hasValue(branchName)) {
      return false;
    }
    const context = this.captureRepository();
    try {
      const branch = await this.fetchBranch(branchName, context);
      const tree = await this.getRequest<BitbucketGetTreeResponse>(
        `${this.repositoryPath(context)}/src/${encodeURIComponent(
          branch.target.hash
        )}/?pagelen=1`,
        context
      );
      if (!Array.isArray(tree.values)) {
        throw new GitReadError("Invalid Bitbucket tree response");
      }
      return tree.values.length > 0;
    } catch (error) {
      if (error instanceof GitReadError && error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  private createCommit(
    branchName: string,
    files: BitbucketCreateCommitActionOptions[],
    context: Context,
    parent?: string
  ) {
    const formData = new FormData();
    for (const file of files) {
      const path = `/${file.file_path.replace(/^\/+/, "")}`;
      // Upload field names identify paths; "files" is reserved for deletions.
      formData.append(
        path,
        new Blob([file.content], { type: "text/plain" }),
        file.file_path
      );
    }
    formData.append("message", "chore: update Vexilla feature flags");
    formData.append("branch", branchName);
    if (parent) {
      formData.append("parents", parent);
    }
    return this.payloadRequest(
      `${this.repositoryPath(context)}/src`,
      formData,
      context
    );
  }

  async initializeBranch(branchName: string) {
    const context = this.captureRepository();
    if (!hasValue(branchName)) {
      throw new GitReadError("Bitbucket branch selection is incomplete");
    }
    let parent: string | undefined;
    try {
      parent = (await this.fetchBranch(branchName, context)).target.hash;
    } catch (error) {
      if (!(error instanceof GitReadError && error.status === 404)) {
        throw error;
      }
    }
    await this.createCommit(
      branchName,
      [{ file_path: "README.md", content: README_CONTENTS }],
      context,
      parent
    );
  }

  async publish(branchName: string, files: FileToPublish[]) {
    const context = this.captureRepository();
    if (!hasValue(branchName)) {
      throw new GitReadError("Bitbucket branch selection is incomplete");
    }
    const expectedHead = this.baselineHeads.get(
      gitLocationKey({ ...context, targetBranch: branchName })
    );
    const pendingFiles = files.map((file) => ({
      file_path: file.filePath,
      content: file.content,
    }));
    const branch = await this.fetchBranch(branchName, context);
    if (expectedHead && branch.target.hash !== expectedHead) {
      throw new GitReadError(
        "The Bitbucket branch changed since the last read. Refresh and merge before publishing.",
        409
      );
    }
    const destination = context.shouldCreatePullRequest
      ? `${context.branchNamePrefix}${Date.now()}`
      : branchName;
    await this.createCommit(
      destination,
      pendingFiles,
      context,
      branch.target.hash
    );
    if (context.shouldCreatePullRequest) {
      await this.payloadRequest(
        `${this.repositoryPath(context)}/pullrequests`,
        JSON.stringify({
          title: "Update Vexilla feature flags",
          description: "This PR was generated by Vexilla.",
          destination: { branch: { name: branchName } },
          source: { branch: { name: destination } },
        }),
        context
      );
    }
  }

  private async getRequest<T>(path: string, context: Context): Promise<T> {
    return (await this.request(path, context)).json();
  }

  private async payloadRequest(
    path: string,
    payload: BodyInit,
    context: Context
  ) {
    const response = await this.request(path, context, payload);
    const body = await response.text();
    return body ? JSON.parse(body) : undefined;
  }

  private async request(path: string, context: Context, payload?: BodyInit) {
    const response = await fetch(
      `${getBitbucketBaseUrl(context.baseUrl)}${path}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${context.accessToken}`,
          ...(typeof payload === "string"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(payload ? { method: "POST", body: payload } : {}),
      }
    );
    if (!response.ok) {
      throw new GitReadError(
        `Bitbucket ${payload ? "write" : "read"} failed (${response.status})`,
        response.status
      );
    }
    return response;
  }
}
