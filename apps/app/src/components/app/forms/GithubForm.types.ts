export interface GitHubGetInstallationsResponse {
  total_count: number;
  installations: GitHubInstallation[];
  [k: string]: unknown;
}
/**
 * Installation
 */
export interface GitHubInstallation {
  /**
   * The ID of the installation.
   */
  id: number;
  account: (GitHubSimpleUser | GitHubEnterprise) &
    (
      | ((GitHubSimpleUser | GitHubEnterprise) & null)
      | (GitHubSimpleUser | GitHubEnterprise)
    );
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
  permissions: GitHubAppPermissions;
  events: string[];
  created_at: string;
  updated_at: string;
  single_file_name: string | null;
  has_multiple_single_files?: boolean;
  single_file_paths?: string[];
  app_slug: string;
  suspended_by: null | GitHubSimpleUser;
  suspended_at: string | null;
  contact_email?: string | null;
  [k: string]: unknown;
}
/**
 * A GitHub user.
 */
export interface GitHubSimpleUser {
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
export interface GitHubEnterprise {
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
export interface GitHubAppPermissions {
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

export interface GitHubGetInstallationRepositoriesResponse {
  total_count: number;
  repositories: GitHubRepository[];
  repository_selection?: string;
  [k: string]: unknown;
}
/**
 * A repository on GitHub.
 */
export interface GitHubRepository {
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
  license: null | GitHubLicenseSimple;
  organization?: null | GitHubSimpleUser;
  forks: number;
  permissions?: {
    admin: boolean;
    pull: boolean;
    triage?: boolean;
    push: boolean;
    maintain?: boolean;
    [k: string]: unknown;
  };
  owner: GitHubSimpleUser;
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
export interface GitHubLicenseSimple {
  key: string;
  name: string;
  url: string | null;
  spdx_id: string | null;
  node_id: string;
  html_url?: string;
  [k: string]: unknown;
}

/**
 * Short Branch
 */
export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
    [k: string]: unknown;
  };
  protected: boolean;
  protection?: GitHubBranchProtection;
  protection_url?: string;
  [k: string]: unknown;
}
/**
 * Branch Protection
 */
export interface GitHubBranchProtection {
  url?: string;
  enabled?: boolean;
  required_status_checks?: GitHubProtectedBranchRequiredStatusCheck;
  enforce_admins?: GitHubProtectedBranchAdminEnforced;
  required_pull_request_reviews?: GitHubProtectedBranchPullRequestReview;
  restrictions?: GitHubBranchRestrictionPolicy;
  required_linear_history?: {
    enabled?: boolean;
    [k: string]: unknown;
  };
  allow_force_pushes?: {
    enabled?: boolean;
    [k: string]: unknown;
  };
  allow_deletions?: {
    enabled?: boolean;
    [k: string]: unknown;
  };
  block_creations?: {
    enabled?: boolean;
    [k: string]: unknown;
  };
  required_conversation_resolution?: {
    enabled?: boolean;
    [k: string]: unknown;
  };
  name?: string;
  protection_url?: string;
  required_signatures?: {
    url: string;
    enabled: boolean;
    [k: string]: unknown;
  };
  /**
   * Whether to set the branch as read-only. If this is true, users will not be able to push to the branch.
   */
  lock_branch?: {
    enabled?: boolean;
    [k: string]: unknown;
  };
  /**
   * Whether users can pull changes from upstream when the branch is locked. Set to `true` to allow fork syncing. Set to `false` to prevent fork syncing.
   */
  allow_fork_syncing?: {
    enabled?: boolean;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * Protected Branch Required Status Check
 */
export interface GitHubProtectedBranchRequiredStatusCheck {
  url?: string;
  enforcement_level?: string;
  contexts: string[];
  checks: {
    context: string;
    app_id: number | null;
    [k: string]: unknown;
  }[];
  contexts_url?: string;
  strict?: boolean;
  [k: string]: unknown;
}
/**
 * Protected Branch Admin Enforced
 */
export interface GitHubProtectedBranchAdminEnforced {
  url: string;
  enabled: boolean;
  [k: string]: unknown;
}
/**
 * Protected Branch Pull Request Review
 */
export interface GitHubProtectedBranchPullRequestReview {
  url?: string;
  dismissal_restrictions?: {
    /**
     * The list of users with review dismissal access.
     */
    users?: GitHubSimpleUser[];
    /**
     * The list of teams with review dismissal access.
     */
    teams?: GitHubTeam[];
    /**
     * The list of apps with review dismissal access.
     */
    apps?: GitHubApp[];
    url?: string;
    users_url?: string;
    teams_url?: string;
    [k: string]: unknown;
  };
  /**
   * Allow specific users, teams, or apps to bypass pull request requirements.
   */
  bypass_pull_request_allowances?: {
    /**
     * The list of users allowed to bypass pull request requirements.
     */
    users?: GitHubSimpleUser[];
    /**
     * The list of teams allowed to bypass pull request requirements.
     */
    teams?: GitHubTeam[];
    /**
     * The list of apps allowed to bypass pull request requirements.
     */
    apps?: GitHubApp[];
    [k: string]: unknown;
  };
  dismiss_stale_reviews: boolean;
  require_code_owner_reviews: boolean;
  required_approving_review_count?: number;
  /**
   * Whether the most recent push must be approved by someone other than the person who pushed it.
   */
  require_last_push_approval?: boolean;
  [k: string]: unknown;
}
/**
 * Groups of organization members that gives permissions on specified repositories.
 */
export interface GitHubTeam {
  id: number;
  node_id: string;
  name: string;
  slug: string;
  description: string | null;
  privacy?: string;
  notification_setting?: string;
  permission: string;
  permissions?: {
    pull: boolean;
    triage: boolean;
    push: boolean;
    maintain: boolean;
    admin: boolean;
    [k: string]: unknown;
  };
  url: string;
  html_url: string;
  members_url: string;
  repositories_url: string;
  parent: null | GitHubTeamSimple;
  [k: string]: unknown;
}
/**
 * Groups of organization members that gives permissions on specified repositories.
 */
export interface GitHubTeamSimple {
  /**
   * Unique identifier of the team
   */
  id: number;
  node_id: string;
  /**
   * URL for the team
   */
  url: string;
  members_url: string;
  /**
   * Name of the team
   */
  name: string;
  /**
   * Description of the team
   */
  description: string | null;
  /**
   * Permission that the team will have for its repositories
   */
  permission: string;
  /**
   * The level of privacy this team should have
   */
  privacy?: string;
  /**
   * The notification setting the team has set
   */
  notification_setting?: string;
  html_url: string;
  repositories_url: string;
  slug: string;
  /**
   * Distinguished Name (DN) that team maps to within LDAP environment
   */
  ldap_dn?: string;
  [k: string]: unknown;
}
/**
 * GitHub apps are a new way to extend GitHub. They can be installed directly on organizations and user accounts and granted access to specific repositories. They come with granular permissions and built-in webhooks. GitHub apps are first class actors within GitHub.
 */
export interface GitHubApp {
  /**
   * Unique identifier of the GitHub app
   */
  id: number;
  /**
   * The slug name of the GitHub app
   */
  slug?: string;
  node_id: string;
  owner: null | GitHubSimpleUser;
  /**
   * The name of the GitHub app
   */
  name: string;
  description: string | null;
  external_url: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  /**
   * The set of permissions for the GitHub app
   */
  permissions: {
    issues: string;
    checks: string;
    metadata: string;
    contents: string;
    deployments: string;
    [k: string]: string;
  };
  /**
   * The list of events for the GitHub app
   */
  events: string[];
  /**
   * The number of installations associated with the GitHub app
   */
  installations_count?: number;
  client_id?: string;
  client_secret?: string;
  webhook_secret?: string | null;
  pem?: string;
  [k: string]: unknown;
}
/**
 * Branch Restriction Policy
 */
export interface GitHubBranchRestrictionPolicy {
  url: string;
  users_url: string;
  teams_url: string;
  apps_url: string;
  users: {
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
  }[];
  teams: {
    id?: number;
    node_id?: string;
    url?: string;
    html_url?: string;
    name?: string;
    slug?: string;
    description?: string | null;
    privacy?: string;
    notification_setting?: string;
    permission?: string;
    members_url?: string;
    repositories_url?: string;
    parent?: string | null;
    [k: string]: unknown;
  }[];
  apps: {
    id?: number;
    slug?: string;
    node_id?: string;
    owner?: {
      login?: string;
      id?: number;
      node_id?: string;
      url?: string;
      repos_url?: string;
      events_url?: string;
      hooks_url?: string;
      issues_url?: string;
      members_url?: string;
      public_members_url?: string;
      avatar_url?: string;
      description?: string;
      gravatar_id?: string;
      html_url?: string;
      followers_url?: string;
      following_url?: string;
      gists_url?: string;
      starred_url?: string;
      subscriptions_url?: string;
      organizations_url?: string;
      received_events_url?: string;
      type?: string;
      site_admin?: boolean;
      [k: string]: unknown;
    };
    name?: string;
    description?: string;
    external_url?: string;
    html_url?: string;
    created_at?: string;
    updated_at?: string;
    permissions?: {
      metadata?: string;
      contents?: string;
      issues?: string;
      single_file?: string;
      [k: string]: unknown;
    };
    events?: string[];
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}

export type GitHubTreeObjectType = "blob" | "tree" | "commit";
export type GitHubTreeObjectMode =
  | "100644"
  | "100755"
  | "040000"
  | "160000"
  | "120000";

export interface GitHubTreeObject {
  path: string;
  mode: GitHubTreeObjectMode;
  type: GitHubTreeObjectType;
  size: number;
  sha: string;
  url: string;
}

export interface GitHubCreateTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeObject[];
  truncated: boolean;
}

export interface GitHubCreateBranchResponse {
  ref: string;
  node_id: string;
  url: string;
  object: {
    type: GitHubTreeObjectType;
    sha: string;
    url: string;
  };
}

export type GitHubVerificationReason =
  | "expired_key"
  | "not_signing_key"
  | "gpgverify_error"
  | "gpgverify_unavailable"
  | "unsigned"
  | "unknown_signature_type"
  | "no_user"
  | "unverified_email"
  | "bad_email"
  | "unknown_key"
  | "malformed_signature"
  | "invalid"
  | "valid";

export interface GitHubCreateCommitResponse {
  sha: string;
  node_id: string;
  url: string;
  author: {
    date: string;
    name: string;
    email: string;
  };
  committer: {
    date: string;
    name: string;
    email: string;
  };
  message: string;
  tree: {
    url: string;
    sha: string;
  };
  parents: {
    url: string;
    html_url: string;
  }[];
  verification: {
    verified: boolean;
    reason: GitHubVerificationReason;
    signature: string | null;
    payload: string | null;
  };
  html_url: string;
}

export interface GitHubCreatePullRequestResponse {
  url: string;
  id: number;
  node_id: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  issue_url: string;
  commits_url: string;
  review_comments_url: string;
  review_comment_url: string;
  comments_url: string;
  statuses_url: string;
  number: number;
  state: string;
  locked: boolean;
  title: string;
  user: GitHubSimpleUser;
  body: string;
  labels: GitHubLabel[];
  milestone: GitHubMilestone;
  active_lock_reason: string;
  created_at: string;
  updated_at: string;
  closed_at: string;
  merged_at: string;
  merge_commit_sha: string;
  assignee: GitHubSimpleUser;
  assignees: GitHubSimpleUser[];
  requested_reviewers: GitHubSimpleUser[];
  requested_teams: GitHubRequestedTeam[];
  head: GitHubHead;
  base: GitHubBase;
  _links: GitHubLinks;
  author_association: string;
  auto_merge: any;
  draft: boolean;
  merged: boolean;
  mergeable: boolean;
  rebaseable: boolean;
  mergeable_state: string;
  merged_by: GitHubMergedBy;
  comments: number;
  review_comments: number;
  maintainer_can_modify: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

interface GitHubLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  description: string;
  color: string;
  default: boolean;
}

interface GitHubMilestone {
  url: string;
  html_url: string;
  labels_url: string;
  id: number;
  node_id: string;
  number: number;
  state: string;
  title: string;
  description: string;
  creator: GitHubSimpleUser;
  open_issues: number;
  closed_issues: number;
  created_at: string;
  updated_at: string;
  closed_at: string;
  due_on: string;
}

interface GitHubRequestedTeam {
  id: number;
  node_id: string;
  url: string;
  html_url: string;
  name: string;
  slug: string;
  description: string;
  privacy: string;
  notification_setting: string;
  permission: string;
  members_url: string;
  repositories_url: string;
}

interface GitHubHead {
  label: string;
  ref: string;
  sha: string;
  user: GitHubSimpleUser;
  repo: GitHubRepo;
}

export interface GitHubRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: GitHubSimpleUser;
  private: boolean;
  html_url: string;
  description: string;
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
  mirror_url: string;
  hooks_url: string;
  svn_url: string;
  homepage: string;
  language: any;
  forks_count: number;
  stargazers_count: number;
  watchers_count: number;
  size: number;
  default_branch: string;
  open_issues_count: number;
  topics: string[];
  has_issues: boolean;
  has_projects: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_downloads: boolean;
  has_discussions: boolean;
  archived: boolean;
  disabled: boolean;
  pushed_at: string;
  created_at: string;
  updated_at: string;
  permissions: GitHubPermissions;
  allow_rebase_merge: boolean;
  temp_clone_token: string;
  allow_squash_merge: boolean;
  allow_merge_commit: boolean;
  allow_forking: boolean;
  forks: number;
  open_issues: number;
  license: GitHubLicense;
  watchers: number;
}

export interface GitHubPermissions {
  admin: boolean;
  push: boolean;
  pull: boolean;
}

export interface GitHubLicense {
  key: string;
  name: string;
  url: string;
  spdx_id: string;
  node_id: string;
}

interface GitHubBase {
  label: string;
  ref: string;
  sha: string;
  user: GitHubSimpleUser;
  repo: GitHubRepo;
}

interface GitHubLinks {
  self: GitHubSelf;
  html: GitHubHtml;
  issue: GitHubIssue;
  comments: GitHubComments;
  review_comments: GitHubReviewComments;
  review_comment: GitHubReviewComment;
  commits: GitHubCommits;
  statuses: GitHubStatuses;
}

interface GitHubSelf {
  href: string;
}

interface GitHubHtml {
  href: string;
}

interface GitHubIssue {
  href: string;
}

interface GitHubComments {
  href: string;
}

interface GitHubReviewComments {
  href: string;
}

interface GitHubReviewComment {
  href: string;
}

interface GitHubCommits {
  href: string;
}

interface GitHubStatuses {
  href: string;
}

interface GitHubMergedBy {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
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
}

export interface GitHubBlobResponse {
  content: string;
  encoding: string;
  url: string;
  sha: string;
  size: number;
  node_id: string;
}
