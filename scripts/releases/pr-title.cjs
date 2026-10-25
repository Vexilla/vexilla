#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const { readReleaseState } = require("./check-release-config.cjs");

function validatePullRequest(
  { title, body = "", files },
  inventory = readReleaseState().inventory
) {
  const directories = [
    ...inventory.clients.filter((c) => c.enabled),
    ...inventory.internalComponents,
  ].map((c) => `${c.directory}/`);
  if (!files.some((file) => directories.some((dir) => file.startsWith(dir)))) {
    return { relevant: false };
  }
  const match =
    /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\([^()\r\n]+\))?(!)?: \S[^\r\n]*$/.exec(
      title
    );
  if (!match) {
    throw new Error(
      "SDK PR titles must be Conventional Commits, for example fix(js): handle missing group or feat(types)!: change the published contract."
    );
  }
  if (/^BREAKING[ -]CHANGE\s*:/im.test(body) && !match[2]) {
    throw new Error(
      "Put ! in the PR title for breaking changes; the squash title must retain the major-version signal."
    );
  }
  if (/\bRelease-As\s*:/i.test(`${title}\n${body}`)) {
    throw new Error(
      "Release-As overrides are unsupported; use fix, feat, or ! to select stable versions."
    );
  }
  return { relevant: true, type: match[1], breaking: !!match[2] };
}

async function main() {
  const event = JSON.parse(
    fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")
  );
  const pr = event.pull_request;
  if (!pr || !Number.isSafeInteger(pr.number)) {
    throw new Error("Expected a pull request event");
  }
  const repository = process.env.GITHUB_REPOSITORY;
  if (repository !== readReleaseState().inventory.repository) {
    throw new Error("Repository does not match the release inventory");
  }
  const files = [];
  for (let page = 1; ; page++) {
    const response = await fetch(
      `${
        process.env.GITHUB_API_URL || "https://api.github.com"
      }/repos/${repository}/pulls/${pr.number}/files?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GH_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (!response.ok) {
      throw new Error(`Cannot read changed files: HTTP ${response.status}`);
    }
    const batch = await response.json();
    if (!Array.isArray(batch)) {
      throw new Error("Invalid changed-files response");
    }
    for (const file of batch) {
      files.push(file.filename);
      if (file.previous_filename) {
        files.push(file.previous_filename);
      }
    }
    if (batch.length < 100) {
      break;
    }
    if (page >= 30) {
      throw new Error(
        "Cannot verify the complete file list for a PR with 3000 or more files"
      );
    }
  }
  const result = validatePullRequest({
    title: pr.title,
    body: pr.body || "",
    files,
  });
  console.log(
    result.relevant
      ? "SDK squash title satisfies the stable release policy."
      : "No active SDK release inputs changed."
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
module.exports = { validatePullRequest };
