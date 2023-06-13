export interface GetInstallationsResponse {
  total_count: number;
  installations: Installation[];
  [k: string]: unknown;
}
/**
 * Installation
 */
export interface Installation {
  /**
   * The ID of the installation.
   */
  id: number;
  account: (SimpleUser | Enterprise) &
    (((SimpleUser | Enterprise) & null) | (SimpleUser | Enterprise));
  /**
   * Describe whether all repositories have been selected or there's a selection involved
   */
  repository_selection: "all" | "selected";
  access_tokens_url: string;
  repositories_url: string;
  html_url: string;
  app_id: number;
  /**
   * The ID of the user or organization this token is being scoped to.
   */
  target_id: number;
  target_type: string;
  permissions: AppPermissions;
  events: string[];
  created_at: string;
  updated_at: string;
  single_file_name: string | null;
  has_multiple_single_files?: boolean;
  single_file_paths?: string[];
  app_slug: string;
  suspended_by: null | SimpleUser;
  suspended_at: string | null;
  contact_email?: string | null;
  [k: string]: unknown;
}
/**
 * A GitHub user.
 */
export interface SimpleUser {
  name?: string | null;
  email?: string | null;
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string | null;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  starred_at?: string;
  [k: string]: unknown;
}
/**
 * An enterprise on GitHub.
 */
export interface Enterprise {
  /**
   * A short description of the enterprise.
   */
  description?: string | null;
  html_url: string;
  /**
   * The enterprise's website URL.
   */
  website_url?: string | null;
  /**
   * Unique identifier of the enterprise
   */
  id: number;
  node_id: string;
  /**
   * The name of the enterprise.
   */
  name: string;
  /**
   * The slug url identifier for the enterprise.
   */
  slug: string;
  created_at: string | null;
  updated_at: string | null;
  avatar_url: string;
  [k: string]: unknown;
}
/**
 * The permissions granted to the user-to-server access token.
 */
export interface AppPermissions {
  /**
   * The level of permission to grant the access token for GitHub Actions workflows, workflow runs, and artifacts.
   */
  actions?: "read" | "write";
  /**
   * The level of permission to grant the access token for repository creation, deletion, settings, teams, and collaborators creation.
   */
  administration?: "read" | "write";
  /**
   * The level of permission to grant the access token for checks on code.
   */
  checks?: "read" | "write";
  /**
   * The level of permission to grant the access token for repository contents, commits, branches, downloads, releases, and merges.
   */
  contents?: "read" | "write";
  /**
   * The level of permission to grant the access token for deployments and deployment statuses.
   */
  deployments?: "read" | "write";
  /**
   * The level of permission to grant the access token for managing repository environments.
   */
  environments?: "read" | "write";
  /**
   * The level of permission to grant the access token for issues and related comments, assignees, labels, and milestones.
   */
  issues?: "read" | "write";
  /**
   * The level of permission to grant the access token to search repositories, list collaborators, and access repository metadata.
   */
  metadata?: "read" | "write";
  /**
   * The level of permission to grant the access token for packages published to GitHub Packages.
   */
  packages?: "read" | "write";
  /**
   * The level of permission to grant the access token to retrieve Pages statuses, configuration, and builds, as well as create new builds.
   */
  pages?: "read" | "write";
  /**
   * The level of permission to grant the access token for pull requests and related comments, assignees, labels, milestones, and merges.
   */
  pull_requests?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage the post-receive hooks for a repository.
   */
  repository_hooks?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage repository projects, columns, and cards.
   */
  repository_projects?: "read" | "write" | "admin";
  /**
   * The level of permission to grant the access token to view and manage secret scanning alerts.
   */
  secret_scanning_alerts?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage repository secrets.
   */
  secrets?: "read" | "write";
  /**
   * The level of permission to grant the access token to view and manage security events like code scanning alerts.
   */
  security_events?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage just a single file.
   */
  single_file?: "read" | "write";
  /**
   * The level of permission to grant the access token for commit statuses.
   */
  statuses?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage Dependabot alerts.
   */
  vulnerability_alerts?: "read" | "write";
  /**
   * The level of permission to grant the access token to update GitHub Actions workflow files.
   */
  workflows?: "write";
  /**
   * The level of permission to grant the access token for organization teams and members.
   */
  members?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage access to an organization.
   */
  organization_administration?: "read" | "write";
  /**
   * The level of permission to grant the access token for custom repository roles management. This property is in beta and is subject to change.
   */
  organization_custom_roles?: "read" | "write";
  /**
   * The level of permission to grant the access token to view and manage announcement banners for an organization.
   */
  organization_announcement_banners?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage the post-receive hooks for an organization.
   */
  organization_hooks?: "read" | "write";
  /**
   * The level of permission to grant the access token for viewing and managing fine-grained personal access token requests to an organization.
   */
  organization_personal_access_tokens?: "read" | "write";
  /**
   * The level of permission to grant the access token for viewing and managing fine-grained personal access tokens that have been approved by an organization.
   */
  organization_personal_access_token_requests?: "read" | "write";
  /**
   * The level of permission to grant the access token for viewing an organization's plan.
   */
  organization_plan?: "read";
  /**
   * The level of permission to grant the access token to manage organization projects and projects beta (where available).
   */
  organization_projects?: "read" | "write" | "admin";
  /**
   * The level of permission to grant the access token for organization packages published to GitHub Packages.
   */
  organization_packages?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage organization secrets.
   */
  organization_secrets?: "read" | "write";
  /**
   * The level of permission to grant the access token to view and manage GitHub Actions self-hosted runners available to an organization.
   */
  organization_self_hosted_runners?: "read" | "write";
  /**
   * The level of permission to grant the access token to view and manage users blocked by the organization.
   */
  organization_user_blocking?: "read" | "write";
  /**
   * The level of permission to grant the access token to manage team discussions and related comments.
   */
  team_discussions?: "read" | "write";
  [k: string]: unknown;
}

export interface GetInstallationRepositoriesResponse {
  total_count: number;
  repositories: Repository[];
  repository_selection?: string;
  [k: string]: unknown;
}
/**
 * A repository on GitHub.
 */
export interface Repository {
  /**
   * Unique identifier of the repository
   */
  id: number;
  node_id: string;
  /**
   * The name of the repository.
   */
  name: string;
  full_name: string;
  license: null | LicenseSimple;
  organization?: null | SimpleUser;
  forks: number;
  permissions?: {
    admin: boolean;
    pull: boolean;
    triage?: boolean;
    push: boolean;
    maintain?: boolean;
    [k: string]: unknown;
  };
  owner: SimpleUser;
  /**
   * Whether the repository is private or public.
   */
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  archive_url: string;
  assignees_url: string;
  blobs_url: string;
  branches_url: string;
  collaborators_url: string;
  comments_url: string;
  commits_url: string;
  compare_url: string;
  contents_url: string;
  contributors_url: string;
  deployments_url: string;
  downloads_url: string;
  events_url: string;
  forks_url: string;
  git_commits_url: string;
  git_refs_url: string;
  git_tags_url: string;
  git_url: string;
  issue_comment_url: string;
  issue_events_url: string;
  issues_url: string;
  keys_url: string;
  labels_url: string;
  languages_url: string;
  merges_url: string;
  milestones_url: string;
  notifications_url: string;
  pulls_url: string;
  releases_url: string;
  ssh_url: string;
  stargazers_url: string;
  statuses_url: string;
  subscribers_url: string;
  subscription_url: string;
  tags_url: string;
  teams_url: string;
  trees_url: string;
  clone_url: string;
  mirror_url: string | null;
  hooks_url: string;
  svn_url: string;
  homepage: string | null;
  language: string | null;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  /**
   * The size of the repository. Size is calculated hourly. When a repository is initially created, the size is 0.
   */
  size: number;
  /**
   * The default branch of the repository.
   */
  default_branch: string;
  open_issues_count: number;
  /**
   * Whether this repository acts as a template that can be used to generate new repositories.
   */
  is_template?: boolean;
  topics?: string[];
  /**
   * Whether issues are enabled.
   */
  has_issues: boolean;
  /**
   * Whether projects are enabled.
   */
  has_projects: boolean;
  /**
   * Whether the wiki is enabled.
   */
  has_wiki: boolean;
  has_pages: boolean;
  /**
   * Whether downloads are enabled.
   */
  has_downloads: boolean;
  /**
   * Whether discussions are enabled.
   */
  has_discussions?: boolean;
  /**
   * Whether the repository is archived.
   */
  archived: boolean;
  /**
   * Returns whether or not this repository disabled.
   */
  disabled: boolean;
  /**
   * The repository visibility: public, private, or internal.
   */
  visibility?: string;
  pushed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  /**
   * Whether to allow rebase merges for pull requests.
   */
  allow_rebase_merge?: boolean;
  template_repository?: {
    id?: number;
    node_id?: string;
    name?: string;
    full_name?: string;
    owner?: {
      login?: string;
      id?: number;
      node_id?: string;
      avatar_url?: string;
      gravatar_id?: string;
      url?: string;
      html_url?: string;
      followers_url?: string;
      following_url?: string;
      gists_url?: string;
      starred_url?: string;
      subscriptions_url?: string;
      organizations_url?: string;
      repos_url?: string;
      events_url?: string;
      received_events_url?: string;
      type?: string;
      site_admin?: boolean;
      [k: string]: unknown;
    };
    private?: boolean;
    html_url?: string;
    description?: string;
    fork?: boolean;
    url?: string;
    archive_url?: string;
    assignees_url?: string;
    blobs_url?: string;
    branches_url?: string;
    collaborators_url?: string;
    comments_url?: string;
    commits_url?: string;
    compare_url?: string;
    contents_url?: string;
    contributors_url?: string;
    deployments_url?: string;
    downloads_url?: string;
    events_url?: string;
    forks_url?: string;
    git_commits_url?: string;
    git_refs_url?: string;
    git_tags_url?: string;
    git_url?: string;
    issue_comment_url?: string;
    issue_events_url?: string;
    issues_url?: string;
    keys_url?: string;
    labels_url?: string;
    languages_url?: string;
    merges_url?: string;
    milestones_url?: string;
    notifications_url?: string;
    pulls_url?: string;
    releases_url?: string;
    ssh_url?: string;
    stargazers_url?: string;
    statuses_url?: string;
    subscribers_url?: string;
    subscription_url?: string;
    tags_url?: string;
    teams_url?: string;
    trees_url?: string;
    clone_url?: string;
    mirror_url?: string;
    hooks_url?: string;
    svn_url?: string;
    homepage?: string;
    language?: string;
    forks_count?: number;
    stargazers_count?: number;
    watchers_count?: number;
    size?: number;
    default_branch?: string;
    open_issues_count?: number;
    is_template?: boolean;
    topics?: string[];
    has_issues?: boolean;
    has_projects?: boolean;
    has_wiki?: boolean;
    has_pages?: boolean;
    has_downloads?: boolean;
    archived?: boolean;
    disabled?: boolean;
    visibility?: string;
    pushed_at?: string;
    created_at?: string;
    updated_at?: string;
    permissions?: {
      admin?: boolean;
      maintain?: boolean;
      push?: boolean;
      triage?: boolean;
      pull?: boolean;
      [k: string]: unknown;
    };
    allow_rebase_merge?: boolean;
    temp_clone_token?: string;
    allow_squash_merge?: boolean;
    allow_auto_merge?: boolean;
    delete_branch_on_merge?: boolean;
    allow_update_branch?: boolean;
    use_squash_pr_title_as_default?: boolean;
    /**
     * The default value for a squash merge commit title:
     *
     * - `PR_TITLE` - default to the pull request's title.
     * - `COMMIT_OR_PR_TITLE` - default to the commit's title (if only one commit) or the pull request's title (when more than one commit).
     */
    squash_merge_commit_title?: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
    /**
     * The default value for a squash merge commit message:
     *
     * - `PR_BODY` - default to the pull request's body.
     * - `COMMIT_MESSAGES` - default to the branch's commit messages.
     * - `BLANK` - default to a blank commit message.
     */
    squash_merge_commit_message?: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
    /**
     * The default value for a merge commit title.
     *
     * - `PR_TITLE` - default to the pull request's title.
     * - `MERGE_MESSAGE` - default to the classic title for a merge message (e.g., Merge pull request #123 from branch-name).
     */
    merge_commit_title?: "PR_TITLE" | "MERGE_MESSAGE";
    /**
     * The default value for a merge commit message.
     *
     * - `PR_TITLE` - default to the pull request's title.
     * - `PR_BODY` - default to the pull request's body.
     * - `BLANK` - default to a blank commit message.
     */
    merge_commit_message?: "PR_BODY" | "PR_TITLE" | "BLANK";
    allow_merge_commit?: boolean;
    subscribers_count?: number;
    network_count?: number;
    [k: string]: unknown;
  } | null;
  temp_clone_token?: string;
  /**
   * Whether to allow squash merges for pull requests.
   */
  allow_squash_merge?: boolean;
  /**
   * Whether to allow Auto-merge to be used on pull requests.
   */
  allow_auto_merge?: boolean;
  /**
   * Whether to delete head branches when pull requests are merged
   */
  delete_branch_on_merge?: boolean;
  /**
   * Whether or not a pull request head branch that is behind its base branch can always be updated even if it is not required to be up to date before merging.
   */
  allow_update_branch?: boolean;
  /**
   * Whether a squash merge commit can use the pull request title as default. **This property has been deprecated. Please use `squash_merge_commit_title` instead.
   */
  use_squash_pr_title_as_default?: boolean;
  /**
   * The default value for a squash merge commit title:
   *
   * - `PR_TITLE` - default to the pull request's title.
   * - `COMMIT_OR_PR_TITLE` - default to the commit's title (if only one commit) or the pull request's title (when more than one commit).
   */
  squash_merge_commit_title?: "PR_TITLE" | "COMMIT_OR_PR_TITLE";
  /**
   * The default value for a squash merge commit message:
   *
   * - `PR_BODY` - default to the pull request's body.
   * - `COMMIT_MESSAGES` - default to the branch's commit messages.
   * - `BLANK` - default to a blank commit message.
   */
  squash_merge_commit_message?: "PR_BODY" | "COMMIT_MESSAGES" | "BLANK";
  /**
   * The default value for a merge commit title.
   *
   * - `PR_TITLE` - default to the pull request's title.
   * - `MERGE_MESSAGE` - default to the classic title for a merge message (e.g., Merge pull request #123 from branch-name).
   */
  merge_commit_title?: "PR_TITLE" | "MERGE_MESSAGE";
  /**
   * The default value for a merge commit message.
   *
   * - `PR_TITLE` - default to the pull request's title.
   * - `PR_BODY` - default to the pull request's body.
   * - `BLANK` - default to a blank commit message.
   */
  merge_commit_message?: "PR_BODY" | "PR_TITLE" | "BLANK";
  /**
   * Whether to allow merge commits for pull requests.
   */
  allow_merge_commit?: boolean;
  /**
   * Whether to allow forking this repo
   */
  allow_forking?: boolean;
  /**
   * Whether to require contributors to sign off on web-based commits
   */
  web_commit_signoff_required?: boolean;
  subscribers_count?: number;
  network_count?: number;
  open_issues: number;
  watchers: number;
  master_branch?: string;
  starred_at?: string;
  /**
   * Whether anonymous git access is enabled for this repository
   */
  anonymous_access_enabled?: boolean;
  [k: string]: unknown;
}
/**
 * License Simple
 */
export interface LicenseSimple {
  key: string;
  name: string;
  url: string | null;
  spdx_id: string | null;
  node_id: string;
  html_url?: string;
  [k: string]: unknown;
}
