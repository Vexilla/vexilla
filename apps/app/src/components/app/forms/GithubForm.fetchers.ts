import {
  captureRemoteRead,
  config,
  isRemoteReadCurrent,
} from "../../../stores/config-valtio";
import { AppState, HostingConfig, HostingConfigGithub } from "../../../types";
import {
  GitFetcher,
  GitReadError,
  hasValue,
  selectGitRepository,
  decodeBase64Text,
  gitLocationKey,
} from "../../../utils/fetcher";
import type { Repository } from "./_GitForm.types";
import {
  GitHubBlobResponse,
  GitHubBranch,
  GitHubCreateBranchResponse,
  GitHubCreateCommitResponse,
  GitHubCreatePullRequestResponse,
  GitHubCreateTreeResponse,
  GitHubGetInstallationRepositoriesResponse,
  GitHubGetInstallationsResponse,
} from "./GithubForm.types";
import { README_CONTENTS } from "../../../utils/repo-init";

export function hasGitHubAuthentication(
  hosting: HostingConfig
): hosting is HostingConfigGithub {
  return (
    hosting.provider === "github" &&
    hosting.providerType === "git" &&
    hasValue(hosting.accessToken)
  );
}

export function canDiscoverGitHubRepositories(hosting: HostingConfig) {
  return hasGitHubAuthentication(hosting) && hasValue(hosting.installationId);
}

export function hasGitHubRepository(hosting: HostingConfig) {
  return (
    hasGitHubAuthentication(hosting) &&
    hasValue(hosting.repositoryId) &&
    hasValue(hosting.owner) &&
    hasValue(hosting.repositoryName)
  );
}

export function canReadGitHubBranch(hosting: HostingConfig, branch: unknown) {
  return hasGitHubRepository(hosting) && hasValue(branch);
}

// Validity is a result, never a prerequisite for reading/validating a branch.
export function canReadGitHubConfig(hosting: HostingConfig) {
  return (
    hasGitHubAuthentication(hosting) &&
    canReadGitHubBranch(hosting, hosting.targetBranch)
  );
}

export function githubDiscoveryKey(hosting: HostingConfig) {
  return JSON.stringify(
    hosting.provider === "github"
      ? [
          hosting.provider,
          hosting.providerType,
          hosting.accessToken,
          hosting.installationId,
        ]
      : [hosting.provider, hosting.providerType]
  );
}

export function githubContextKey(hosting: HostingConfig) {
  return JSON.stringify(
    hosting.provider === "github"
      ? [
          githubDiscoveryKey(hosting),
          hosting.repositoryId,
          hosting.owner,
          hosting.repositoryName,
          hosting.targetBranch,
        ]
      : [hosting.provider, hosting.providerType]
  );
}

export function selectGitHubRepository(
  hosting: HostingConfigGithub,
  repository?: Repository
) {
  selectGitRepository(hosting, repository);
}

const GITHUB_BASE_URL = `https://api.github.com`;
const commonHeaders = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

type PublicationFile = { content: string; filePath: string };

// The response body is deliberately reduced to a safe internal classification.
class EmptyGitHubRepositoryError extends GitReadError {
  constructor() {
    super("GitHub repository requires initialization", 409);
  }
}

export class GitHubFetcher extends GitFetcher {
  readonly usesReadPreparation: boolean = true;
  private readonly baselineHeads = new Map<string, string>();

  private rememberReadHead(
    context: HostingConfigGithub,
    head: string,
    ticket: ReturnType<typeof captureRemoteRead>
  ) {
    if (
      isRemoteReadCurrent(ticket) &&
      githubContextKey(context) === githubContextKey(config.hosting)
    ) {
      this.baselineHeads.set(gitLocationKey(context), head);
    }
  }

  isConfigReady(hosting: HostingConfig) {
    return canReadGitHubConfig(hosting);
  }
  isRepositoryReady(hosting: HostingConfig) {
    return hasGitHubRepository(hosting);
  }
  getReadContextKey(hosting: HostingConfig) {
    return githubContextKey(hosting);
  }

  async prepareRead(): Promise<"ready" | "initialization-required"> {
    const context = this.repositoryContext();
    if (!canReadGitHubConfig(context)) {
      throw new GitReadError("GitHub branch selection is incomplete");
    }
    const branches = await this.paginate<GitHubBranch>(
      `${this.repositoryPath(context)}/branches`,
      context
    );
    if (branches.some((branch) => branch.name === context.targetBranch)) {
      return "ready";
    }
    if (branches.length) {
      throw new GitReadError("The selected GitHub branch does not exist", 404);
    }
    try {
      // A successful empty branch list alone also permits repositories with tags.
      // Only GitHub's specific empty Git database response proves initialization
      // is required. Do not start the ordinary named-branch/config read here.
      await this.request(
        `${this.repositoryPath(context)}/git/trees/${encodeURIComponent(
          context.targetBranch || ""
        )}`,
        context,
        {},
        true
      );
    } catch (error) {
      if (error instanceof EmptyGitHubRepositoryError) {
        return "initialization-required";
      }
      throw error;
    }
    throw new GitReadError("Unable to verify the selected GitHub branch");
  }

  shouldPrepareAfterReadError(error: unknown) {
    return (
      error instanceof GitReadError &&
      (error.status === 404 || error.status === 409)
    );
  }

  async fetchInstallations(): Promise<GitHubGetInstallationsResponse> {
    const context = { ...config.hosting };
    if (!hasGitHubAuthentication(context)) {
      throw new GitReadError("GitHub authentication is incomplete");
    }
    const installations = await this.paginate<
      GitHubGetInstallationsResponse["installations"][number]
    >("/user/installations", context, "installations");
    return { total_count: installations.length, installations };
  }

  async fetchBranches(): Promise<GitHubBranch[]> {
    const context = this.repositoryContext();
    return this.paginate<GitHubBranch>(
      `${this.repositoryPath(context)}/branches`,
      context
    );
  }

  async fetchRepositories(
    installationId: string
  ): Promise<GitHubGetInstallationRepositoriesResponse> {
    const context = { ...config.hosting };
    if (
      !hasGitHubAuthentication(context) ||
      !canDiscoverGitHubRepositories({ ...context, installationId })
    ) {
      throw new GitReadError("GitHub installation selection is incomplete");
    }
    const repositories = await this.paginate<
      GitHubGetInstallationRepositoriesResponse["repositories"][number]
    >(
      `/user/installations/${encodeURIComponent(installationId)}/repositories`,
      context,
      "repositories"
    );
    return { total_count: repositories.length, repositories };
  }

  private repositoryContext(): HostingConfigGithub {
    const context = { ...config.hosting };
    if (!hasGitHubAuthentication(context) || !hasGitHubRepository(context)) {
      throw new GitReadError("GitHub repository selection is incomplete");
    }
    return Object.freeze(context);
  }

  private repositoryPath(context: HostingConfigGithub) {
    return `/repos/${encodeURIComponent(context.owner)}/${encodeURIComponent(
      context.repositoryName
    )}`;
  }

  private async fetchBranch(branchName: string, context: HostingConfigGithub) {
    if (!canReadGitHubBranch(context, branchName)) {
      throw new GitReadError("GitHub branch selection is incomplete");
    }
    return this.getRequest<GitHubBranch>(
      `${this.repositoryPath(context)}/branches/${encodeURIComponent(
        branchName
      )}`,
      context
    );
  }

  private async fetchTree(treeSha: string, context: HostingConfigGithub) {
    if (!hasGitHubRepository(context) || !hasValue(treeSha)) {
      throw new GitReadError("GitHub tree selection is incomplete");
    }
    return this.getRequest<GitHubCreateTreeResponse>(
      `${this.repositoryPath(context)}/git/trees/${encodeURIComponent(
        treeSha
      )}`,
      context
    );
  }

  private async createTree(
    baseTreeSha: string,
    files: PublicationFile[],
    context: HostingConfigGithub
  ) {
    return this.payloadRequest<GitHubCreateTreeResponse>(
      `${this.repositoryPath(context)}/git/trees`,
      {
        tree: files.map(({ filePath, content }) => ({
          path: filePath,
          mode: "100644",
          type: "blob",
          content,
        })),
        base_tree: baseTreeSha,
      },
      context
    );
  }

  private async createBranch(
    newBranchName: string,
    head: string,
    context: HostingConfigGithub
  ) {
    return this.payloadRequest<GitHubCreateBranchResponse>(
      `${this.repositoryPath(context)}/git/refs`,
      { ref: `refs/heads/${newBranchName}`, sha: head },
      context
    );
  }

  private async createCommit(
    treeSha: string,
    parentSha: string,
    context: HostingConfigGithub
  ) {
    return this.payloadRequest<GitHubCreateCommitResponse>(
      `${this.repositoryPath(context)}/git/commits`,
      {
        message: "chore: update Vexilla feature flags",
        tree: treeSha,
        parents: [parentSha],
      },
      context
    );
  }

  private async updateBranch(
    branchName: string,
    commitSha: string,
    context: HostingConfigGithub
  ) {
    return this.payloadRequest<GitHubCreateBranchResponse>(
      `${this.repositoryPath(context)}/git/refs/heads/${encodeURIComponent(
        branchName
      )}`,
      { sha: commitSha },
      context,
      "PATCH"
    );
  }

  private async createPullRequest(
    branchName: string,
    baseBranchName: string,
    context: HostingConfigGithub,
    description = ""
  ) {
    return this.payloadRequest<GitHubCreatePullRequestResponse>(
      `${this.repositoryPath(context)}/pulls`,
      {
        title: "Update Vexilla feature flags",
        head: branchName,
        base: baseBranchName,
        maintainer_can_modify: true,
        body: `${description}\nThis PR was generated by Vexilla.`,
      },
      context
    );
  }

  async getCurrentConfig(): Promise<AppState | null> {
    const ticket = captureRemoteRead();
    const context = this.repositoryContext();
    if (!canReadGitHubConfig(context)) {
      throw new GitReadError("GitHub config selection is incomplete");
    }
    const branch = await this.fetchBranch(context.targetBranch || "", context);
    const head = branch?.commit?.sha;
    if (!hasValue(head)) {
      throw new GitReadError("Invalid GitHub branch response");
    }
    const tree = await this.fetchTree(
      branch?.commit?.commit?.tree.sha || branch?.commit?.sha,
      context
    );
    if (!Array.isArray(tree.tree)) {
      throw new GitReadError("Invalid GitHub tree response");
    }
    const entry = tree.tree.find((blob) => blob.path === "config.json");
    if (!entry) {
      if (tree.truncated) {
        throw new GitReadError(
          "GitHub tree is incomplete; config absence is unknown"
        );
      }
      this.rememberReadHead(context, head, ticket);
      return null;
    }
    if (!hasValue(entry.sha) || (entry.type && entry.type !== "blob")) {
      throw new GitReadError("Invalid GitHub config tree entry");
    }
    const blob = await this.getRequest<GitHubBlobResponse>(
      `${this.repositoryPath(context)}/git/blobs/${encodeURIComponent(
        entry.sha
      )}`,
      context
    );
    if (
      typeof blob.content !== "string" ||
      (blob.encoding && blob.encoding !== "base64")
    ) {
      throw new GitReadError("Invalid GitHub config blob response");
    }
    const result = JSON.parse(decodeBase64Text(blob.content));
    if (
      !result ||
      typeof result !== "object" ||
      !Array.isArray(result.groups) ||
      !result.hosting ||
      typeof result.hosting !== "object" ||
      !Number.isFinite(result.modifiedAt)
    ) {
      throw new GitReadError("Invalid GitHub config document");
    }
    this.rememberReadHead(context, head, ticket);
    return result;
  }

  async isBranchValid(branchName: string) {
    const context = { ...config.hosting };
    if (
      !hasGitHubAuthentication(context) ||
      !canReadGitHubBranch(context, branchName)
    ) {
      return false;
    }
    try {
      const response = await this.fetchTree(branchName, context);
      if (!Array.isArray(response.tree)) {
        throw new GitReadError("Invalid GitHub tree response");
      }
      if (response.truncated) {
        throw new GitReadError(
          "GitHub tree is incomplete; validity is unknown"
        );
      }
      return true;
    } catch (error) {
      if (
        error instanceof GitReadError &&
        (error.status === 404 || error.status === 409)
      ) {
        return false;
      }
      throw error;
    }
  }

  async initializeBranch(branchName: string) {
    const context = this.repositoryContext();
    if (!hasValue(branchName)) {
      throw new GitReadError("GitHub branch selection is incomplete");
    }
    // The Git refs API cannot initialize an empty repository. The contents API can.
    // https://docs.github.com/en/rest/guides/using-the-rest-api-to-interact-with-your-git-database
    const content = btoa(
      Array.from(new TextEncoder().encode(README_CONTENTS), (byte) =>
        String.fromCharCode(byte)
      ).join("")
    );
    await this.payloadRequest(
      `${this.repositoryPath(context)}/contents/README.md`,
      { branch: branchName, message: "chore: initialize Vexilla", content },
      context,
      "PUT"
    );
  }

  async publish(branchName: string, files: PublicationFile[]) {
    const context = this.repositoryContext();
    if (!hasValue(branchName)) {
      throw new GitReadError("GitHub branch selection is incomplete");
    }
    const snapshot = files.map((file) => ({ ...file }));
    const expectedHead = this.baselineHeads.get(
      gitLocationKey({ ...context, targetBranch: branchName })
    );
    const branch = await this.fetchBranch(branchName, context);
    const parentSha = branch?.commit?.sha;
    const baseTreeSha = branch?.commit?.commit?.tree.sha;
    if (!hasValue(parentSha) || !hasValue(baseTreeSha)) {
      throw new GitReadError("Invalid GitHub branch response");
    }
    if (expectedHead !== undefined && expectedHead !== parentSha) {
      throw new GitReadError(
        "GitHub branch changed since the reviewed configuration was read",
        409
      );
    }
    const tree = await this.createTree(baseTreeSha, snapshot, context);
    if (!hasValue(tree.sha)) {
      throw new GitReadError("Invalid GitHub created tree response");
    }
    const commit = await this.createCommit(tree.sha, parentSha, context);
    if (!hasValue(commit.sha)) {
      throw new GitReadError("Invalid GitHub created commit response");
    }
    if (context.shouldCreatePullRequest) {
      const newBranchName = `${context.branchNamePrefix}${Date.now()}`;
      await this.createBranch(newBranchName, commit.sha, context);
      await this.createPullRequest(newBranchName, branchName, context);
    } else {
      await this.updateBranch(branchName, commit.sha, context);
    }
  }

  private async paginate<T>(
    path: string,
    context: HostingConfigGithub,
    collection?: "installations" | "repositories"
  ): Promise<T[]> {
    let url = new URL(path, GITHUB_BASE_URL);
    url.searchParams.set("per_page", "100");
    const initialPath = url.pathname;
    const visited = new Set<string>();
    const entryIdentities = new Set<string>();
    const all: T[] = [];
    let total: number | undefined;
    for (let page = 0; page < 1000; page++) {
      if (
        url.origin !== GITHUB_BASE_URL ||
        url.pathname !== initialPath ||
        url.username ||
        url.password ||
        visited.has(url.href)
      ) {
        throw new GitReadError("Invalid or repeated GitHub pagination URL");
      }
      visited.add(url.href);
      const response = await this.request(url.href, context);
      const body = await response.json();
      const entries = collection ? body[collection] : body;
      if (!Array.isArray(entries)) {
        throw new GitReadError("Invalid GitHub paginated response");
      }
      if (collection && body.total_count !== undefined) {
        if (
          !Number.isSafeInteger(body.total_count) ||
          body.total_count < 0 ||
          (total !== undefined && body.total_count !== total)
        ) {
          throw new GitReadError("GitHub collection changed during pagination");
        }
        total = body.total_count;
      }
      for (const entry of entries) {
        const identity = collection ? entry?.id : entry?.name;
        if (
          !(
            collection &&
            typeof identity === "number" &&
            Number.isSafeInteger(identity)
          ) &&
          !hasValue(identity)
        ) {
          throw new GitReadError("Invalid GitHub pagination entry");
        }
        const key = JSON.stringify([typeof identity, identity]);
        if (entryIdentities.has(key)) {
          throw new GitReadError("Repeated GitHub pagination entry");
        }
        entryIdentities.add(key);
      }
      all.push(...entries);
      const nextLinks = response.headers
        .get("Link")
        ?.split(",")
        .filter((link) => /;\s*rel="next"/.test(link));
      const next = nextLinks?.[0]?.match(/<([^>]+)>/)?.[1];
      if ((nextLinks?.length && !next) || (nextLinks?.length || 0) > 1) {
        throw new GitReadError("Invalid GitHub pagination link");
      }
      if (!next) {
        if (total !== undefined && all.length !== total) {
          throw new GitReadError(
            "GitHub pagination ended before the collection was complete"
          );
        }
        return all;
      }
      if (!entries.length) {
        throw new GitReadError("Empty GitHub pagination page has a successor");
      }
      url = new URL(next, url);
    }
    throw new GitReadError("GitHub pagination exceeded the page limit");
  }

  private async request(
    path: string,
    context: HostingConfigGithub,
    options: RequestInit = {},
    classifyEmptyRepository = false
  ) {
    const url = new URL(path, GITHUB_BASE_URL);
    if (url.origin !== GITHUB_BASE_URL || url.username || url.password) {
      throw new GitReadError("Invalid GitHub API URL");
    }
    const response = await fetch(url.href, {
      ...options,
      redirect: "error",
      headers: {
        ...commonHeaders,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${context.accessToken}`,
      },
    });
    if (!response.ok) {
      if (classifyEmptyRepository && response.status === 409) {
        try {
          const body: unknown = await response.json();
          if (
            body &&
            typeof body === "object" &&
            "message" in body &&
            body.message === "Git Repository is empty."
          ) {
            throw new EmptyGitHubRepositoryError();
          }
        } catch (error) {
          if (error instanceof EmptyGitHubRepositoryError) {
            throw error;
          }
          // Malformed response bodies still produce the safe HTTP error below.
        }
      }
      throw new GitReadError(
        `GitHub request failed (${response.status})`,
        response.status
      );
    }
    return response;
  }

  private async getRequest<T>(
    path: string,
    context: HostingConfigGithub
  ): Promise<T> {
    return (await this.request(path, context)).json();
  }

  private async payloadRequest<T>(
    path: string,
    payload: Record<string, unknown>,
    context: HostingConfigGithub,
    method: "POST" | "PUT" | "PATCH" = "POST"
  ): Promise<T> {
    const response = await this.request(path, context, {
      body: JSON.stringify(payload),
      method,
    });
    return response.json();
  }
}
