'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {publish, sha256, crateEnvelope} = require('./publish-native.cjs');

function fixture(t, sdk = 'rust') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'native-release-test-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const artifact = Buffer.from('verified package bytes');
  const docs = Buffer.from('verified docs bytes');
  const receipt = {schemaVersion: 1, sdk, package: 'vexilla_client', version: '2.0.0', revision: 'a'.repeat(40),
    artifact: `vexilla_client-2.0.0.${sdk === 'rust' ? 'crate' : 'tar'}`, sha256: sha256(artifact),
    registryChecksum: sha256(artifact), verification: {package: true, consumer: true, docs: true},
    publishMetadata: {name: 'vexilla_client', vers: '2.0.0', deps: []},
    docs: {artifact: 'vexilla_client-2.0.0-docs.tar.gz', sha256: sha256(docs)}};
  fs.writeFileSync(path.join(directory, receipt.artifact), artifact);
  fs.writeFileSync(path.join(directory, receipt.docs.artifact), docs);
  const file = path.join(directory, 'receipt.json');
  fs.writeFileSync(file, JSON.stringify(receipt));
  return {receipt, file, artifact, docs};
}
const json = (data, status = 200) => new Response(JSON.stringify(data), {status});
const absent = () => json({}, 404);
const published = receipt => json(receipt.sdk === 'rust'
  ? {version: {num: receipt.version, checksum: receipt.sha256}}
  : {version: receipt.version, checksum: receipt.sha256});
const rustEnv = {GITHUB_ACTIONS: 'true', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.invalid/oidc', CARGO_REGISTRY_TOKEN: 'temporary-test-token'};

// Every request is mocked: these tests never obtain a credential or write to a registry.
test('existing matching crate succeeds without authentication or upload', async t => {
  const f = fixture(t); let calls = 0;
  const result = await publish('rust', f.file, {fetchImpl: async () => { calls++; return published(f.receipt); }, env: {}});
  assert.equal(result.outcome, 'published'); assert.equal(calls, 1);
});
test('existing conflicting payload fails without credential requests', async t => {
  const f = fixture(t); let calls = 0;
  await assert.rejects(publish('rust', f.file, {fetchImpl: async () => { calls++; return json({version: {num: '2.0.0', checksum: '0'.repeat(64)}}); }, env: {}}), /checksum conflicts/);
  assert.equal(calls, 1);
});
test('registry availability and auth errors are never treated as absence', async t => {
  const f = fixture(t);
  for (const status of [401, 403, 429, 500, 503]) {
    let calls = 0;
    await assert.rejects(publish('rust', f.file, {fetchImpl: async () => { calls++; return json({}, status); }, env: rustEnv}), /lookup failed/);
    assert.equal(calls, 1);
  }
});
test('failure before upload remains absent and does not create a new version', async t => {
  const f = fixture(t); const methods = [];
  await assert.rejects(publish('rust', f.file, {fetchImpl: async (url, options) => {
    methods.push(options.method ?? 'GET'); return options.method === 'PUT' ? json({}, 503) : absent();
  }, env: rustEnv}), /upload failed/);
  assert.deepEqual(methods, ['GET', 'PUT', 'GET']);
});
test('lost response is reconciled by authoritative matching crate checksum', async t => {
  const f = fixture(t); let state = false; let uploads = 0;
  const result = await publish('rust', f.file, {fetchImpl: async (url, options) => {
    if (options.method === 'PUT') { state = true; uploads++; assert.deepEqual(options.body, crateEnvelope(f.receipt, f.artifact)); throw new Error('response lost'); }
    return state ? published(f.receipt) : absent();
  }, env: rustEnv});
  assert.equal(result.outcome, 'published'); assert.equal(uploads, 1);
});
test('missing trust fails with an actionable error and no upload', async t => {
  for (const sdk of ['rust', 'elixir']) {
    const f = fixture(t, sdk); let uploads = 0;
    await assert.rejects(publish(sdk, f.file, {fetchImpl: async (url, options) => {
      if (options.method) { uploads++; } return absent();
    }, env: {}}), sdk === 'rust' ? /trusted publisher/ : /workload identity/);
    assert.equal(uploads, 0);
  }
});
test('tampered artifact fails before any registry or credential access', async t => {
  const f = fixture(t); fs.writeFileSync(path.join(path.dirname(f.file), f.receipt.artifact), 'tampered');
  await assert.rejects(publish('rust', f.file, {fetchImpl: async () => { throw new Error('must not fetch'); }}), /digest mismatch/);
});
test('Hex docs-only recovery does not upload the verified existing package', async t => {
  const f = fixture(t, 'elixir'); let docsPublished = false; const writes = [];
  const env = {GITHUB_ACTIONS: 'true', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://oidc.example.invalid/token?test=1', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'oidc-request-token'};
  const result = await publish('elixir', f.file, {env, fetchImpl: async (input, options) => {
    const url = String(input);
    if (url.endsWith('/oidc/audience')) { return json({audience: 'hexpm'}); }
    if (url.startsWith('https://oidc.example.invalid')) { assert.equal(new URL(url).searchParams.get('audience'), 'hexpm'); return json({value: 'test-jwt'}); }
    if (url.endsWith('/oauth/token')) { assert.equal(options.body.get('scope'), 'package:hexpm/vexilla_client'); return json({access_token: 'test-hex-access', token_type: 'bearer'}); }
    if (url.endsWith('/docs') || url.startsWith('https://repo.hex.pm/docs/')) {
      if (options.method === 'POST') { writes.push(url); assert.deepEqual(options.body, f.docs); docsPublished = true; return new Response('', {status: 201}); }
      return docsPublished ? new Response(f.docs) : absent();
    }
    assert.equal(options.method, undefined); return published(f.receipt);
  }});
  assert.equal(result.outcome, 'published'); assert.equal(writes.length, 1); assert.match(writes[0], /releases\/2\.0\.0\/docs$/);
});
test('existing Hex docs with conflicting bytes cannot be overwritten', async t => {
  const f = fixture(t, 'elixir'); let calls = 0;
  await assert.rejects(publish('elixir', f.file, {env: {}, fetchImpl: async input => {
    calls++; return String(input).startsWith('https://repo.hex.pm/docs/') ? new Response('conflict') : published(f.receipt);
  }}), /docs differ/);
  assert.equal(calls, 2);
});
