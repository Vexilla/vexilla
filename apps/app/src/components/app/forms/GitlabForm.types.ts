export type GitLabGetProjectsResponse = GitLabProjectSimple[];

interface GitLabProjectSimple {
  id: number;
  description: null;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  created_at: Date;
  default_branch: string;
  tag_list: string[];
  topics: string[];
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  web_url: string;
  avatar_url: string;
  star_count: number;
  last_activity_at: Date;
  namespace: Namespace;
}

interface Namespace {
  id: number;
  name: string;
  path: string;
  kind: string;
  full_path: string;
  parent_id: null;
  avatar_url: null;
  web_url: string;
}

export interface GitLabCreateBranchOptions {
  branch: string;
  ref: string;
}

export interface GitLabBranch {
  name: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  web_url: string;
  commit: GitLabCommit;
}

export interface GitLabCreateCommitOptions {
  branch: string;
  commit_message: string;
  start_branch?: string;
  start_sha?: string;
  start_project?: number | string;
  actions?: GitLabCreateCommitActionOptions[];
  author_email?: string;
  author_name?: string;
  stats?: boolean;
  force?: boolean;
}

export interface GitLabCreateCommitActionOptions {
  action: "create" | "delete" | "move" | "update" | "chmod";
  file_path: string;
  previous_path?: string;
  content?: string;
  encoding?: "text" | "base64";
  last_commit_id?: string;
  execute_filemode?: boolean;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  created_at: string;
  parent_ids: string[];
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  authored_date: string;
  committer_name: string;
  committer_email: string;
  committed_date: string;
  trailers: Trailers;
  web_url: string;
}

type Trailers = Record<string, any>;

export type GitLabRepositoryTreeResponse = {
  id: string;
  name: string;
  type: "tree" | "blob";
  path: string;
  mode: string;
}[];

/*
-----------------------------------------
Merge Requests
-----------------------------------------
*/

export interface GitLabCreateMergeRequestOptions {
  id: number;
  source_branch: string;
  target_branch: string;
  title: string;
  allow_collaboration?: boolean;
  approvals_before_merge?: number;
  allow_maintainer_to_push?: boolean;
  assignee_id?: number;
  assignee_ids?: number[];
  description?: string;
  labels?: string;
  milestone_id?: number;
  remove_source_branch?: boolean;
  reviewers_ids?: number[];
  squash?: boolean;
  target_project_id?: number;
}

export interface GitLabCreateMergeRequestResponse {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  imported: boolean;
  imported_from: string;
  created_at: Date;
  updated_at: Date;
  target_branch: string;
  source_branch: string;
  upvotes: number;
  downvotes: number;
  author: Assignee;
  assignee: Assignee;
  source_project_id: number;
  target_project_id: number;
  labels: string[];
  draft: boolean;
  work_in_progress: boolean;
  milestone: Milestone;
  merge_when_pipeline_succeeds: boolean;
  merge_status: string;
  detailed_merge_status: string;
  merge_error: null;
  sha: string;
  merge_commit_sha: null;
  squash_commit_sha: null;
  user_notes_count: number;
  discussion_locked: null;
  should_remove_source_branch: boolean;
  force_remove_source_branch: boolean;
  allow_collaboration: boolean;
  allow_maintainer_to_push: boolean;
  web_url: string;
  references: References;
  time_stats: TimeStats;
  squash: boolean;
  subscribed: boolean;
  changes_count: string;
  merge_user: Assignee;
  merged_at: Date;
  prepared_at: Date;
  closed_by: null;
  closed_at: null;
  latest_build_started_at: Date;
  latest_build_finished_at: Date;
  first_deployed_to_production_at: null;
  pipeline: Pipeline;
  diff_refs: DiffRefs;
  diverged_commits_count: number;
  task_completion_status: TaskCompletionStatus;
}

export interface GitLabGetMergeRequestResponse {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  imported: boolean;
  imported_from: string;
  created_at: Date;
  updated_at: Date;
  merge_user: null;
  merged_at: null;
  prepared_at: Date;
  closed_by: null;
  closed_at: null;
  target_branch: string;
  source_branch: string;
  user_notes_count: number;
  upvotes: number;
  downvotes: number;
  author: Author;
  assignees: any[];
  assignee: null;
  reviewers: any[];
  source_project_id: number;
  target_project_id: number;
  labels: any[];
  draft: boolean;
  work_in_progress: boolean;
  milestone: null;
  merge_when_pipeline_succeeds: boolean;
  merge_status: string;
  detailed_merge_status: string;
  sha: string;
  merge_commit_sha: null;
  squash_commit_sha: null;
  discussion_locked: null;
  should_remove_source_branch: null;
  force_remove_source_branch: boolean;
  references: References;
  web_url: string;
  time_stats: TimeStats;
  squash: boolean;
  task_completion_status: TaskCompletionStatus;
  has_conflicts: boolean;
  blocking_discussions_resolved: boolean;
  approvals_before_merge: ApprovalsBeforeMerge;
  subscribed: boolean;
  changes_count: string;
  latest_build_started_at: Date;
  latest_build_finished_at: null;
  first_deployed_to_production_at: null;
  pipeline: Pipeline;
  head_pipeline: HeadPipeline;
  diff_refs: DiffRefs;
  merge_error: null;
  first_contribution: boolean;
  user: User;
}

interface ApprovalsBeforeMerge {
  id: number;
  title: string;
  approvals_before_merge: null;
}

interface Author {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
}

interface HeadPipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  source: string;
  created_at: Date;
  updated_at: Date;
  web_url: string;
  before_sha: string;
  tag: boolean;
  yaml_errors: null;
  user: Author;
  started_at: Date;
  finished_at: Date;
  committed_at: null;
  duration: number;
  queued_duration: number;
  coverage: null;
  detailed_status: DetailedStatus;
}

interface DetailedStatus {
  icon: string;
  text: string;
  label: string;
  group: string;
  tooltip: string;
  has_details: boolean;
  details_path: string;
  illustration: null;
  favicon: string;
}

interface User {
  can_merge: boolean;
}

interface Assignee {
  id: number;
  name: string;
  username: string;
  state: string;
  avatar_url: null | string;
  web_url: string;
}

interface DiffRefs {
  base_sha: string;
  head_sha: string;
  start_sha: string;
}

interface Milestone {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string;
  state: string;
  created_at: Date;
  updated_at: Date;
  due_date: Date;
  start_date: Date;
  web_url: string;
}

interface Pipeline {
  id: number;
  sha: string;
  ref: string;
  status: string;
  web_url: string;
}

interface References {
  short: string;
  relative: string;
  full: string;
}

interface TaskCompletionStatus {
  count: number;
  completed_count: number;
}

interface TimeStats {
  time_estimate: number;
  total_time_spent: number;
  human_time_estimate: null;
  human_total_time_spent: null;
}

export interface GitLabRepositoryFileResponse {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
  execute_filemode: boolean;
}
