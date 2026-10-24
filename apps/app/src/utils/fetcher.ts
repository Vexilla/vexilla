import type { AppState, HostingConfig } from "../types";
import type { Repository } from "../components/app/forms/_GitForm.types";
import { DEFAULT_BRANCH_PREFIX } from "./constants";

type GitHosting = Extract<HostingConfig, { providerType: "git" }>;

export function createGitHosting(provider: GitHosting["provider"]): GitHosting {
  return {
    provider,
    providerType: "git",
    accessToken: "",
    repositoryId: "",
    owner: "",
    repositoryName: "",
    targetBranch: "",
    branchIsValid: false,
    shouldCreatePullRequest: false,
    branchNamePrefix: DEFAULT_BRANCH_PREFIX,
    ...(provider === "github" ? { installationId: "" } : {}),
    ...(provider === "bitbucket" ? { workspaceId: "" } : {}),
  } as GitHosting;
}

export function hasValue(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export class GitReadError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "GitReadError";
  }
}

export function isGitUnauthorized(error: unknown) {
  return error instanceof GitReadError && error.status === 401;
}

// Errors may contain provider response bodies or URLs. Show only known-safe text.
export function gitErrorMessage(error: unknown) {
  if (error instanceof GitReadError && error.status) {
    return `The Git provider request failed (HTTP ${error.status}). Please retry.`;
  }
  return "Unable to complete the Git provider request. Check your connection and retry.";
}

export function decodeBase64Text(content: string) {
  return new TextDecoder().decode(
    Uint8Array.from(atob(content), (character) => character.charCodeAt(0))
  );
}

export function gitReadContextKey(hosting: HostingConfig) {
  return JSON.stringify(
    hosting.providerType === "git"
      ? [
          hosting.provider,
          hosting.providerType,
          hosting.accessToken,
          hosting.repositoryId,
          hosting.owner,
          hosting.repositoryName,
          hosting.targetBranch,
          hosting.provider === "github" ? hosting.installationId : undefined,
          hosting.provider === "bitbucket" ? hosting.workspaceId : undefined,
          "baseUrl" in hosting ? hosting.baseUrl : undefined,
        ]
      : [hosting.provider, hosting.providerType]
  );
}

// Baselines belong to a repository location, not to a particular credential.
export function gitLocationKey(hosting: HostingConfig) {
  return hosting.providerType === "git"
    ? JSON.stringify([
        hosting.provider,
        hosting.repositoryId,
        hosting.targetBranch,
        "baseUrl" in hosting ? hosting.baseUrl || "" : "",
        hosting.provider === "bitbucket" ? hosting.workspaceId : "",
      ])
    : "";
}

export function selectGitRepository(
  hosting: GitHosting,
  repository?: Repository
) {
  const sameRepository =
    !!repository &&
    (hosting.repositoryId === repository.id ||
      !!repository.legacyIds?.includes(hosting.repositoryId));
  const targetBranch =
    sameRepository && hasValue(hosting.targetBranch)
      ? hosting.targetBranch
      : repository
      ? repository.defaultBranch || "main"
      : "";
  Object.assign(hosting, {
    repositoryId: repository?.id || "",
    owner: repository?.owner || "",
    repositoryName: repository?.path || repository?.name || "",
    targetBranch,
    branchIsValid:
      sameRepository && targetBranch === hosting.targetBranch
        ? hosting.branchIsValid
        : false,
  });
}

export class Fetcher {
  readonly usesReadPreparation: boolean = false;

  // Providers can require discovery before ordinary configuration reads.
  async prepareRead(): Promise<"ready" | "initialization-required"> {
    return "ready";
  }

  shouldPrepareAfterReadError(_error: unknown): boolean {
    return false;
  }

  isConfigReady(hosting: HostingConfig): boolean {
    void hosting;
    return false;
  }

  getReadContextKey(hosting: HostingConfig) {
    return gitReadContextKey(hosting);
  }

  async publish(
    _branchName: string,
    _files: {
      content: string;
      filePath: string;
    }[]
  ) {
    throw new Error("publish() not implemented");
  }

  // null means the branch was read successfully and contains no config.json.
  async getCurrentConfig(): Promise<AppState | null> {
    throw new Error("getCurrentConfig() not implemented");
  }
}

export class GitFetcher extends Fetcher {
  isRepositoryReady(hosting: HostingConfig): boolean {
    void hosting;
    return false;
  }

  async getRepositories() {
    throw new Error("getRepositories() not implemented");
  }

  async getBranches(_branch: string) {
    throw new Error("getBranches() not implemented");
  }

  async isBranchValid(_branch: string): Promise<boolean> {
    throw new Error("isBranchValid() not implemented");
  }

  async initializeBranch(_branch: string) {
    throw new Error("initializeBranch() not implemented");
  }
}
