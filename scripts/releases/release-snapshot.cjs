"use strict";

const assert = require("node:assert/strict");
const { SHA } = require("./check-release-config.cjs");

class SupersededSnapshot extends Error {
  constructor(revision) {
    super(
      `Main advanced beyond release snapshot ${revision}; defer release PR maintenance to the newer push.`
    );
    // The pinned code-suggester uses async-retry, whose bail flag stops retries.
    this.bail = true;
  }
}

function releaseSnapshot(github, revision) {
  assert(SHA.test(revision || ""), "An immutable release snapshot is required");
  const scm = Object.create(github);
  const api = github.getGitHubApi().octokitAPIs.octokit;
  const getBranch = api.repos.getBranch;
  // GitHub's published create/updatePullRequest methods use this scoped client
  // for code-suggester. Do not alter the client's release/tag operations.
  scm.octokit = Object.create(api);
  scm.octokit.repos = Object.create(api.repos);
  // Octokit's endpoint group is a Proxy. Define an own property rather than
  // invoking its inherited set trap and replacing the original client's method.
  Object.defineProperty(scm.octokit.repos, "getBranch", {
    value: async (options) => {
      const response = await getBranch.call(api.repos, options);
      if (options.branch === "main" && response.data.commit.sha !== revision) {
        throw new SupersededSnapshot(revision);
      }
      // This is the actual immutable parent/tree source used by code-suggester.
      // Advancement after this read is safe: the generated branch stays rooted
      // at revision, so merging it uses Git's normal three-way conflict handling.
      return response;
    },
  });
  scm.getFileContentsOnBranch = (name, ref) =>
    github.getFileContentsOnBranch(name, ref === "main" ? revision : ref);
  scm.mergeCommitIterator = async function* (...args) {
    let reachedSnapshot = false;
    for await (const commit of github.mergeCommitIterator(...args)) {
      if (!reachedSnapshot && commit.sha !== revision) {
        continue;
      }
      reachedSnapshot = true;
      yield commit;
    }
    if (!reachedSnapshot) {
      throw new SupersededSnapshot(revision);
    }
  };
  return scm;
}

module.exports = { releaseSnapshot, SupersededSnapshot };
