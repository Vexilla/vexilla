#!/usr/bin/env node
'use strict';
// Upload only already verified artifact bytes. Registry identity checks happen
// before authentication; this module never builds, bumps, overwrites or yanks.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const USER_AGENT = 'Vexilla-sdk-release (https://github.com/Vexilla/vexilla)';
const STABLE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const DIGEST = /^[a-f0-9]{64}$/;
function assert(condition, message) { if (!condition) { throw new Error(message); } }

function loadCandidate(sdk, receiptPath) {
  assert(['elixir', 'rust'].includes(sdk), 'Only enabled native SDKs elixir/rust are supported');
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  assert(receipt.schemaVersion === 1 && receipt.sdk === sdk && receipt.package === 'vexilla_client', 'Native receipt identity mismatch');
  assert(STABLE.test(receipt.version) && /^[a-f0-9]{40}$/.test(receipt.revision), 'Receipt must name a stable version and full release revision');
  assert(receipt.verification?.package === true && receipt.verification?.consumer === true, 'Native package/consumer verification is missing');
  assert(DIGEST.test(receipt.sha256) && receipt.registryChecksum === receipt.sha256, 'Invalid native registry checksum');
  const readArtifact = (name, digest) => {
    assert(typeof name === 'string' && name === path.basename(name) && DIGEST.test(digest), 'Invalid artifact filename/digest');
    const bytes = fs.readFileSync(path.join(path.dirname(receiptPath), name));
    assert(sha256(bytes) === digest, `Artifact digest mismatch: ${name}`);
    return bytes;
  };
  const extension = sdk === 'rust' ? 'crate' : 'tar';
  assert(receipt.artifact === `${receipt.package}-${receipt.version}.${extension}`, 'Unexpected artifact filename');
  const artifact = readArtifact(receipt.artifact, receipt.sha256);
  let docs;
  if (sdk === 'elixir') {
    assert(receipt.verification.docs === true && receipt.docs, 'Hex documentation verification is missing');
    assert(receipt.docs.artifact === `${receipt.package}-${receipt.version}-docs.tar.gz`, 'Unexpected documentation filename');
    docs = readArtifact(receipt.docs.artifact, receipt.docs.sha256);
  } else {
    assert(receipt.publishMetadata?.name === receipt.package && receipt.publishMetadata.vers === receipt.version, 'Crate upload metadata identity mismatch');
    assert(Array.isArray(receipt.publishMetadata.deps), 'Crate upload dependency metadata is missing');
  }
  return {receipt, artifact, docs};
}

async function request(fetchImpl, url, options = {}) {
  return fetchImpl(url, {redirect: 'error', signal: AbortSignal.timeout(60000), ...options,
    headers: {'user-agent': USER_AGENT, ...options.headers}});
}
async function jsonResponse(response, operation) {
  assert(response.ok, `${operation} failed (HTTP ${response.status}); check registry availability, ownership and OIDC trust`);
  const body = await response.text();
  const result = body ? JSON.parse(body) : {};
  assert(!result.errors, `${operation} returned registry errors`);
  return result;
}
async function lookup(receipt, fetchImpl) {
  const url = receipt.sdk === 'elixir'
    ? `https://hex.pm/api/packages/${receipt.package}/releases/${receipt.version}`
    : `https://crates.io/api/v1/crates/${receipt.package}/${receipt.version}`;
  const response = await request(fetchImpl, url, {headers: {accept: 'application/json'}});
  if (response.status === 404) { return null; }
  const result = await jsonResponse(response, 'Registry version lookup');
  const published = receipt.sdk === 'rust' ? result.version : result;
  assert(published && (published.num ?? published.version) === receipt.version, 'Registry returned a mismatched version');
  assert(typeof published.checksum === 'string' && published.checksum.toLowerCase() === receipt.registryChecksum,
    `Registry checksum conflicts with approved ${receipt.sdk} artifact; refusing to overwrite or skip`);
  assert(!published.yanked && !published.retirement, 'The existing registry version is yanked or retired');
  return published;
}

async function hexToken(fetchImpl, env) {
  assert(env.GITHUB_ACTIONS === 'true' && env.ACTIONS_ID_TOKEN_REQUEST_URL && env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    'Hex OIDC requires GitHub Actions permissions.id-token: write and a configured package/workflow/environment workload identity');
  const audience = await jsonResponse(await request(fetchImpl, 'https://hex.pm/api/oidc/audience'), 'Hex audience discovery');
  assert(typeof audience.audience === 'string' && audience.audience, 'Hex did not return an OIDC audience');
  const identityUrl = new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
  assert(identityUrl.protocol === 'https:', 'GitHub OIDC request URL must use HTTPS');
  identityUrl.searchParams.set('audience', audience.audience);
  const identity = await jsonResponse(await request(fetchImpl, identityUrl, {
    headers: {authorization: `Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`}}), 'GitHub OIDC request');
  assert(typeof identity.value === 'string' && identity.value, 'GitHub did not return an OIDC identity token');
  const result = await jsonResponse(await request(fetchImpl, 'https://hex.pm/api/oauth/token', {
    method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: identity.value,
      scope: 'package:hexpm/vexilla_client'})}), 'Hex workload identity exchange');
  assert(typeof result.access_token === 'string' && result.access_token && result.token_type?.toLowerCase() === 'bearer', 'Hex did not issue a scoped Bearer access token');
  // Never print token responses. GitHub additionally masks the short-lived token.
  if (env.GITHUB_ACTIONS === 'true') { process.stdout.write(`::add-mask::${result.access_token}\n`); }
  return `Bearer ${result.access_token}`;
}

function crateEnvelope(receipt, artifact) {
  const metadata = Buffer.from(JSON.stringify(receipt.publishMetadata));
  const metadataLength = Buffer.alloc(4);
  const artifactLength = Buffer.alloc(4);
  metadataLength.writeUInt32LE(metadata.length);
  artifactLength.writeUInt32LE(artifact.length);
  return Buffer.concat([metadataLength, metadata, artifactLength, artifact]);
}

async function publish(sdk, receiptPath, {fetchImpl = fetch, env = process.env} = {}) {
  const {receipt, artifact, docs} = loadCandidate(sdk, receiptPath);
  let existing = await lookup(receipt, fetchImpl);
  let token;
  const authenticate = async () => {
    if (token) { return token; }
    if (sdk === 'elixir') { token = await hexToken(fetchImpl, env); }
    else {
      assert(env.GITHUB_ACTIONS === 'true' && env.ACTIONS_ID_TOKEN_REQUEST_URL && env.CARGO_REGISTRY_TOKEN,
        'Rust publication requires the official crates-io-auth-action short-lived token after verification; configure the crates.io trusted publisher and id-token: write');
      token = env.CARGO_REGISTRY_TOKEN;
    }
    return token;
  };
  const upload = async (url, body, method = 'POST') => jsonResponse(await request(fetchImpl, url, {
    method, body, headers: {authorization: await authenticate(), 'content-type': 'application/octet-stream', accept: 'application/json'}}), 'Registry upload');
  if (!existing) {
    try {
      if (sdk === 'elixir') { await upload(`https://hex.pm/api/packages/${receipt.package}/releases?replace=false`, artifact); }
      else { await upload('https://crates.io/api/v1/crates/new', crateEnvelope(receipt, artifact), 'PUT'); }
    } catch (error) {
      // An upload can succeed while its response is lost. A failed upload counts
      // as successful only when an authoritative second lookup proves identity.
      existing = await lookup(receipt, fetchImpl);
      if (!existing) { throw error; }
    }
    existing = await lookup(receipt, fetchImpl);
    assert(existing, 'Registry upload returned but version identity is not visible; retry the same release later');
  }
  if (sdk === 'elixir') {
    const docsUrl = `https://hex.pm/api/packages/${receipt.package}/releases/${receipt.version}/docs`;
    // The API GET redirects; fetch the public authoritative archive directly.
    const docsArchiveUrl = `https://repo.hex.pm/docs/${receipt.package}-${receipt.version}.tar.gz`;
    const response = await request(fetchImpl, docsArchiveUrl, {headers: {accept: 'application/json'}});
    if (response.status === 404) {
      // The package checksum was verified above, so docs-only recovery always
      // targets the same immutable approved package version.
      try {
        await upload(docsUrl, docs);
      } catch (error) {
        const retry = await request(fetchImpl, docsArchiveUrl, {headers: {accept: 'application/json'}});
        if (!retry.ok || sha256(Buffer.from(await retry.arrayBuffer())) !== receipt.docs.sha256) { throw error; }
      }
      const verified = await request(fetchImpl, docsArchiveUrl, {headers: {accept: 'application/json'}});
      assert(verified.ok && sha256(Buffer.from(await verified.arrayBuffer())) === receipt.docs.sha256,
        'Hex docs upload could not be reconciled against the approved docs digest');
    } else {
      assert(response.ok, `Hex docs lookup failed (HTTP ${response.status})`);
      assert(sha256(Buffer.from(await response.arrayBuffer())) === receipt.docs.sha256,
        'Existing Hex docs differ from the verified artifact; refusing to overwrite');
    }
  }
  return {sdk, package: receipt.package, version: receipt.version, revision: receipt.revision,
    sha256: receipt.sha256, outcome: 'published', ...(docs ? {docsSha256: receipt.docs.sha256} : {})};
}

if (require.main === module) {
  const [sdk, flag, receiptPath, ...extra] = process.argv.slice(2);
  if (flag !== '--receipt' || !receiptPath || extra.length) {
    console.error('Usage: node scripts/releases/publish-native.cjs <elixir|rust> --receipt <receipt.json>');
    process.exitCode = 1;
  } else { publish(sdk, receiptPath).then(result => console.log(JSON.stringify(result)), error => {
    console.error(error.message); process.exitCode = 1;
  }); }
}
module.exports = {publish, loadCandidate, lookup, crateEnvelope, sha256};
