const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function clientFor(inventory, sdk) {
  const client = inventory.clients.find((c) => c.id === sdk);
  if (
    !client ||
    client.enabled !== true ||
    !["js", "elixir", "rust"].includes(sdk)
  ) {
    throw Error("SDK is not enabled for publishing: " + sdk);
  }
  return client;
}
function parseTag(client, tag) {
  const prefix = client.component + "-v";
  if (
    typeof tag !== "string" ||
    !tag.startsWith(prefix) ||
    !stable.test(tag.slice(prefix.length))
  ) {
    throw Error("Expected existing stable tag " + prefix + "MAJOR.MINOR.PATCH");
  }
  const version = tag.slice(prefix.length);
  if (client.baseline?.minimumAutomatedVersion) {
    const { compareVersions } = require("./check-release-config.cjs");
    if (compareVersions(version, client.baseline.minimumAutomatedVersion) < 0) {
      throw Error(
        "Release version is below the reviewed public API compatibility floor"
      );
    }
  }
  return version;
}
function readManifest(
  client,
  read = (file) => fs.readFileSync(path.join(root, file), "utf8")
) {
  const dir = client.directory;
  if (client.id === "js") {
    const p = JSON.parse(read(dir + "/package.json"));
    return { package: p.name, version: p.version };
  }
  const source = read(
    dir + (client.id === "rust" ? "/Cargo.toml" : "/mix.exs")
  );
  const version = source.match(/\bversion\s*[:=]\s*"([^"]+)"/);
  const name = source.match(
    client.id === "rust"
      ? /^name\s*=\s*"([^"]+)"/m
      : /\bapp:\s*:([a-z_][a-z_0-9]*)/
  );
  if (!version || !name) {
    throw Error("Cannot read native manifest");
  }
  return { package: name[1], version: version[1] };
}
function validateApproval(
  client,
  tag,
  revision,
  release,
  pr,
  files,
  permission,
  expectedBot
) {
  const version = parseTag(client, tag);
  if (!/^[a-f0-9]{40}$/.test(revision)) {
    throw Error("Release must resolve to a full commit SHA");
  }
  if (
    release.draft ||
    release.prerelease ||
    release.tag_name !== tag ||
    !release.id
  ) {
    throw Error("Missing stable GitHub Release");
  }
  if (!expectedBot || pr.user?.login !== expectedBot) {
    throw Error("Release PR must be authored by the configured release bot");
  }
  if (
    !pr.merged_at ||
    pr.merge_commit_sha !== revision ||
    pr.base?.ref !== "main" ||
    !pr.head?.ref?.startsWith("release-please--branches--main") ||
    !pr.labels?.some((l) => l.name === "autorelease: tagged")
  ) {
    throw Error("Tag is not the merged Release Please PR revision");
  }
  if (!["write", "maintain", "admin"].includes(permission)) {
    throw Error("Release PR was not merged by a repository maintainer");
  }
  const manifest =
    client.directory +
    { js: "/package.json", elixir: "/mix.exs", rust: "/Cargo.toml" }[client.id];
  if (
    !files.includes(manifest) ||
    !files.includes(".release-please-manifest.json")
  ) {
    throw Error("Release PR does not contain this component version");
  }
  return {
    sdk: client.id,
    package: client.publish.package,
    version,
    tag,
    revision,
    releaseId: release.id,
    pr: pr.number,
  };
}
async function githubRequest(route, token = process.env.GH_TOKEN) {
  if (!token) {
    throw Error("GH_TOKEN is required to verify release approval");
  }
  const res = await fetch("https://api.github.com" + route, {
    headers: {
      authorization: "Bearer " + token,
      accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw Error(`GitHub verification failed (${res.status}) for ${route}`);
  }
  return res.json();
}
async function verifyRelease(
  inventory,
  sdk,
  tag,
  requestedRevision,
  request = githubRequest,
  expectedBot = process.env.SDK_RELEASE_BOT_LOGIN
) {
  const client = clientFor(inventory, sdk);
  parseTag(client, tag); // Reject untrusted refs before contacting APIs.
  const base = "/repos/" + inventory.repository;
  const release = await request(
    base + "/releases/tags/" + encodeURIComponent(tag)
  );
  let object = (
    await request(base + "/git/ref/tags/" + encodeURIComponent(tag))
  ).object;
  for (let depth = 0; object.type === "tag" && depth < 5; depth++) {
    object = (await request(base + "/git/tags/" + object.sha)).object;
  }
  if (object.type !== "commit") {
    throw Error("Tag does not resolve to a commit");
  }
  const revision = object.sha;
  if (requestedRevision && requestedRevision !== revision) {
    throw Error("Release output and tag revision disagree");
  }
  const prs = await request(
    base + "/commits/" + revision + "/pulls?per_page=100"
  );
  const matches = prs.filter(
    (p) =>
      p.merge_commit_sha === revision &&
      p.merged_at &&
      p.user?.login === expectedBot
  );
  if (matches.length !== 1) {
    throw Error("Cannot uniquely identify the approved release PR");
  }
  const pr = await request(base + "/pulls/" + matches[0].number);
  const files = [];
  for (let page = 1; ; page++) {
    const batch = await request(
      base + "/pulls/" + pr.number + "/files?per_page=100&page=" + page
    );
    files.push(...batch.map((f) => f.filename));
    if (batch.length < 100) {
      break;
    }
    if (page === 30) {
      throw Error("Release PR file list exceeds verification limit");
    }
  }
  const permission = await request(
    base +
      "/collaborators/" +
      encodeURIComponent(pr.merged_by?.login || "") +
      "/permission"
  );
  const identity = validateApproval(
    client,
    tag,
    revision,
    release,
    pr,
    files,
    permission.permission,
    expectedBot
  );
  if (
    pr.base.repo?.full_name !== inventory.repository ||
    pr.head.repo?.full_name !== inventory.repository
  ) {
    throw Error("Release PR repository identity mismatch");
  }
  const comparison = await request(base + "/compare/" + revision + "...main");
  if (!["ahead", "identical"].includes(comparison.status)) {
    throw Error("Release is not on main");
  }
  const filename =
    client.directory +
    { js: "/package.json", elixir: "/mix.exs", rust: "/Cargo.toml" }[sdk];
  const source = await request(
    base + "/contents/" + filename + "?ref=" + revision
  );
  if (source.encoding !== "base64" || typeof source.content !== "string") {
    throw Error("Missing release manifest");
  }
  const manifest = readManifest(client, () =>
    Buffer.from(source.content, "base64").toString("utf8")
  );
  if (
    manifest.package !== identity.package ||
    manifest.version !== identity.version
  ) {
    throw Error("Tag, package, and manifest disagree");
  }
  if (sdk === "js") {
    const types = await request(
      base + "/contents/packages/types/package.json?ref=" + revision
    );
    if (
      JSON.parse(Buffer.from(types.content, "base64").toString()).version !==
      identity.version
    ) {
      throw Error("JS/types linked versions disagree");
    }
  }
  return identity;
}
module.exports = {
  root,
  stable,
  clientFor,
  parseTag,
  readManifest,
  validateApproval,
  githubRequest,
  verifyRelease,
};
if (require.main === module) {
  (async () => {
    const inventory = require("../../.github/sdk-release-inventory.json");
    if (inventory.repository !== process.env.GITHUB_REPOSITORY) {
      throw Error("Repository identity mismatch");
    }
    const identity = await verifyRelease(
      inventory,
      process.env.SDK,
      process.env.RELEASE_TAG,
      process.env.RELEASE_REVISION
    );
    fs.writeFileSync(
      "release-identity.json",
      JSON.stringify(identity, null, 2) + "\n"
    );
    fs.appendFileSync(
      process.env.GITHUB_OUTPUT,
      `revision=${identity.revision}\nversion=${identity.version}\n`
    );
  })().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
