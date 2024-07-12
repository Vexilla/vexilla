export interface BitbucketGetWorkspacesResponse {
  pagelen: number;
  page: number;
  size: number;
  values: WorkspaceValue[];
}

export interface WorkspaceValue {
  type: string;
  permission: string;
  last_accessed: Date;
  added_on: Date;
  user: User;
  workspace: Workspace;
}

interface User {
  type: string;
  uuid: string;
  nickname: string;
  display_name: string;
}

interface Workspace {
  type: string;
  uuid: string;
  slug: string;
  name: string;
}
export interface BitbucketGetRepositoriesResponse {
  size: number;
  page: number;
  pagelen: number;
  next: string;
  previous: string;
  values: RepositoryValue[];
}

interface RepositoryValue {
  type: string;
  links: Links;
  uuid: string;
  full_name: string;
  is_private: boolean;
  scm: string;
  owner: {
    display_name: string;
    type: string;
    username: string;
    uuid: string;
    links: UserLinks;
  };
  name: string;
  description: string;
  created_on: string;
  updated_on: string;
  size: number;
  language: string;
  has_issues: boolean;
  has_wiki: boolean;
  fork_policy: string;
  project: Mainbranch;
  mainbranch: Mainbranch;
}

interface Links {
  self: Avatar;
  html: Avatar;
  avatar: Avatar;
  pullrequests: Avatar;
  commits: Avatar;
  forks: Avatar;
  watchers: Avatar;
  downloads: Avatar;
  clone: Avatar[];
  hooks: Avatar;
}

interface Avatar {
  href: string;
  name: string;
}

interface Mainbranch {
  type: string;
  name: string;
}

export interface BitbucketGetBranchesResponse {
  pagelen: number;
  size: number;
  values: BitbucketBranchValue[];
  page: number;
  next: string;
}

export interface BitbucketBranchValue {
  name: string;
  links: ValueLinks;
  default_merge_strategy: string;
  merge_strategies: string[];
  type: string;
  target: Target;
}

interface ValueLinks {
  commits: Commits;
  self: Commits;
  html: Commits;
}

interface Commits {
  href: string;
}

interface Target {
  hash: string;
  repository: Repository;
  links: TargetLinks;
  author: BranchAuthor;
  parents: Parent[];
  date: Date;
  message: string;
  type: string;
}

interface BranchAuthor {
  raw: string;
  type: string;
  user: BranchUser;
}

interface BranchUser {
  display_name: string;
  uuid: string;
  links: UserLinks;
  nickname: string;
  type: string;
  account_id: string;
}

interface TargetLinks {
  self: Commits;
  comments: Commits;
  patch: Commits;
  html: Commits;
  diff: Commits;
  approve: Commits;
  statuses: Commits;
}

interface Parent {
  hash: string;
  type: string;
  links: ParentLinks;
}

interface ParentLinks {
  self: Commits;
  html: Commits;
}

interface Repository {
  links: UserLinks;
  type: string;
  name: string;
  full_name: string;
  uuid: string;
}

export interface BitbucketGetBranchResponse {
  name: string;
  links: BitbucketGetBranchResponseLinks;
  default_merge_strategy: string;
  merge_strategies: string[];
  type: string;
  target: Target;
}

interface BitbucketGetBranchResponseLinks {
  commits: Commits;
  self: Commits;
  html: Commits;
}

interface UserLinks {
  self: Commits;
  html: Commits;
  avatar: Commits;
}

export interface BitbucketGetTreeResponse {
  pagelen: number;
  values: TreeValue[];
  page: number;
  size: number;
}

interface TreeValue {
  path: string;
  type: string;
  links: TreeValueLinks;
  commit: Commit;
  attributes?: any[];
  size?: number;
}

interface Commit {
  type: string;
  hash: string;
  links: CommitLinks;
}

interface CommitLinks {
  self: Meta;
  html: Meta;
}

interface Meta {
  href: string;
}

interface TreeValueLinks {
  self: Meta;
  meta: Meta;
}

export interface BitbucketCreateCommitActionOptions {
  file_path: string;
  content: string;
}
