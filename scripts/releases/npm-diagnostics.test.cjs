const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { npmDiagnostics, uploadNpm } = require("./publish-npm.cjs");

test("npm's swallowed exchange rejection produces useful credential-free diagnostics", () => {
  const log = [
    "0 info using npm@12.2.1",
    "1 info using node@v24.16.0",
    "2 http fetch POST 404 https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/@vexilla%2fclient 120ms",
    "3 verbose oidc Failed token exchange request with body message: secret-response-body",
    "3 verbose oidc Successfully retrieved and set token",
    "3 verbose oidc secret-response-continuation",
    "5 verbose stack Error: ENEEDAUTH secret-token",
  ].join("\n");
  assert.deepEqual(npmDiagnostics(log), {
    npm: "12.2.1",
    node: "24.16.0",
    oidc: "exchange-rejected",
    exchangeHttpStatus: 404,
  });
  assert(!JSON.stringify(npmDiagnostics(log)).includes("secret"));
});

test("diagnostics distinguish permissions, missing token, and successful exchange without echoing arbitrary log text", () => {
  for (const [message, oidc] of [
    [
      "Skipped because incorrect permissions for id-token within GitHub workflow",
      "github-permission-missing",
    ],
    ["Skipped because no id_token available", "github-token-unavailable"],
    [
      "Failed because token exchange was missing the token in the response body",
      "exchange-token-missing",
    ],
    ["Successfully retrieved and set token", "exchange-succeeded"],
    ["Failure with message: Bearer secret", "oidc-runtime-error"],
    ["unknown secret https://issuer.invalid/?token=secret", "unobserved"],
  ]) {
    assert.equal(npmDiagnostics("1 verbose oidc " + message).oidc, oidc);
  }
  assert.deepEqual(npmDiagnostics("untrusted arbitrary secret text"), {
    oidc: "unobserved",
  });
});

test("failed npm upload reports sanitized diagnostics and deletes its private logs", () => {
  let logs;
  assert.throws(
    () =>
      uploadNpm("/approved/package.tgz", (command, args, options) => {
        assert.equal(command, "npm");
        assert.equal(args[0], "publish");
        assert.equal(args[1], "/approved/package.tgz");
        assert(args.includes("--ignore-scripts"));
        assert(args.includes("--registry=https://registry.npmjs.org"));
        assert(args.includes("--logs-max=1"));
        assert.equal(options.stdio, "inherit");
        logs = args
          .find((arg) => arg.startsWith("--logs-dir="))
          .slice("--logs-dir=".length);
        fs.writeFileSync(
          path.join(logs, "debug-0.log"),
          "1 verbose oidc Failure with message: secret"
        );
        return { status: 1 };
      }),
    (error) => {
      assert.match(error.message, /npm publish failed/);
      assert.match(error.message, /oidc-runtime-error/);
      assert(!error.message.includes("secret"));
      return true;
    }
  );
  assert(!fs.existsSync(logs));
});

test("successful npm upload deletes its logs without reporting a failure", () => {
  let logs;
  uploadNpm("/approved/package.tgz", (_command, args) => {
    logs = args
      .find((arg) => arg.startsWith("--logs-dir="))
      .slice("--logs-dir=".length);
    return { status: 0 };
  });
  assert(!fs.existsSync(logs));
});

test("missing logs preserve the original upload failure", () => {
  assert.throws(
    () =>
      uploadNpm("/approved/package.tgz", (_command, args) => {
        fs.rmSync(
          args
            .find((arg) => arg.startsWith("--logs-dir="))
            .slice("--logs-dir=".length),
          { recursive: true }
        );
        return { status: 1 };
      }),
    /npm publish failed.*unavailable/
  );
});

test("a successful exchange followed by a publish failure is not reported as trust rejection", () => {
  assert.deepEqual(
    npmDiagnostics(
      [
        "0 http fetch POST 201 https://registry.npmjs.org/-/npm/v1/oidc/token/exchange/package/@vexilla%2fclient 120ms",
        "1 verbose oidc Successfully retrieved and set token",
        "2 error code E403",
      ].join("\n")
    ),
    { oidc: "exchange-succeeded", exchangeHttpStatus: 201 }
  );
});
