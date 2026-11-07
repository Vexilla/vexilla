const test = require("node:test");
const assert = require("node:assert/strict");
const {
  safeURL,
  projectEvent,
  classifyError,
  isHostingMutation,
  instrument,
  install,
} = require("./browser/support/protocol-diagnostics.cjs");

const secret = "DO-NOT-RECORD-test-token";
const frameId = "A".repeat(32);

test("URLs retain known local source paths and external origins without credentials", () => {
  assert.equal(
    safeURL(
      `http://user:${secret}@127.0.0.1:5173/src/stores/config-valtio.ts?token=${secret}#${secret}`
    ),
    "http://127.0.0.1:5173/src/stores/config-valtio.ts"
  );
  assert.equal(
    safeURL(
      `https://user:${secret}@github.com/private/${secret}?token=${secret}`
    ),
    "https://github.com"
  );
  assert.equal(
    safeURL(`http://127.0.0.1:5173/${secret}`),
    "http://127.0.0.1:5173/[redacted]"
  );
  for (const value of [
    `data:text/plain,${secret}`,
    `file:///${secret}`,
    secret,
    undefined,
  ]) {
    assert.equal(safeURL(value), "[redacted-url]");
  }
  assert.equal(safeURL("about:blank"), "about:blank");
});

test("context and navigation projections include lifecycle IDs and safe enum values only", () => {
  assert.deepEqual(
    projectEvent("Runtime.executionContextCreated", {
      context: {
        id: 7,
        name: secret,
        origin: secret,
        uniqueId: secret,
        auxData: { frameId, isDefault: true, type: "default", token: secret },
      },
    }),
    { contextId: 7, frameId, isDefault: true, type: "default" }
  );
  assert.deepEqual(
    projectEvent("Runtime.executionContextDestroyed", {
      executionContextId: 7,
      token: secret,
    }),
    { contextId: 7 }
  );
  assert.deepEqual(
    projectEvent("Runtime.executionContextsCleared", { token: secret }),
    {}
  );
  const navigation = projectEvent("Page.frameRequestedNavigation", {
    frameId,
    url: `http://127.0.0.1:5173/?token=${secret}`,
    reason: "scriptInitiated",
    disposition: "currentTab",
    source: secret,
  });
  assert.equal(navigation.reason, "scriptInitiated");
  assert.equal(navigation.url, "http://127.0.0.1:5173/");
  const unknown = projectEvent("Page.frameScheduledNavigation", {
    frameId: secret,
    url: secret,
    reason: secret,
    disposition: secret,
    delay: secret,
  });
  assert.equal(unknown.reason, "other");
  assert.equal(unknown.frameId, "[redacted-id]");
  assert.equal(JSON.stringify([navigation, unknown]).includes(secret), false);
  assert.equal(projectEvent(`unknown-${secret}`, { token: secret }), null);
});

test("document requests retain initiator location without request values or function names", () => {
  const request = projectEvent("Network.requestWillBeSent", {
    type: "Document",
    frameId,
    loaderId: frameId,
    requestId: "123.45",
    token: secret,
    request: {
      url: `https://github.com/${secret}?code=${secret}`,
      headers: { Authorization: secret },
      postData: secret,
    },
    initiator: {
      type: "script",
      url: `http://127.0.0.1:5173/src/App.tsx?secret=${secret}`,
      lineNumber: 21,
      stack: {
        description: secret,
        callFrames: [
          {
            functionName: secret,
            url: `http://127.0.0.1:5173/src/stores/config-valtio.ts#${secret}`,
            lineNumber: 11,
            columnNumber: 9,
          },
        ],
        parent: {
          callFrames: [
            {
              functionName: secret,
              url: `https://github.com/${secret}`,
              lineNumber: 4,
            },
          ],
        },
      },
    },
  });
  assert.equal(request.url, "https://github.com");
  assert.equal(request.initiator.type, "script");
  assert.deepEqual(request.initiator.stack[0], {
    url: "http://127.0.0.1:5173/src/stores/config-valtio.ts",
    lineNumber: 11,
    columnNumber: 9,
  });
  assert.equal(JSON.stringify(request).includes(secret), false);
  assert.equal(JSON.stringify(request).includes("Authorization"), false);
  assert.equal(
    projectEvent("Network.requestWillBeSent", {
      type: "Fetch",
      request: { url: secret },
    }),
    null
  );
});

test("Vite reload evidence keeps the message type and omits payloads", () => {
  assert.deepEqual(
    projectEvent("Network.webSocketFrameReceived", {
      response: {
        payloadData: JSON.stringify({
          type: "full-reload",
          path: secret,
          token: secret,
        }),
      },
    }),
    { type: "full-reload" }
  );
  for (const payloadData of [
    secret,
    JSON.stringify({ type: secret }),
    JSON.stringify({ type: "error", err: secret }),
  ]) {
    assert.equal(
      projectEvent("Network.webSocketFrameReceived", {
        response: { payloadData },
      }),
      null
    );
  }
});

test("protocol errors use fixed classifications rather than arbitrary messages", () => {
  for (const [message, reason] of [
    [
      "Protocol error (Runtime.callFunctionOn): Promise was collected",
      "promise-collected",
    ],
    ["Cannot find context with specified id", "context-missing"],
    ["Cannot find object with given id", "object-missing"],
    ["Execution context was destroyed", "context-destroyed"],
    ["Inspected target navigated or closed", "target-navigated-or-closed"],
    ["Object reference chain is too long", "serialization-depth"],
    ["Object couldn't be returned by value", "serialization-value"],
  ]) {
    assert.equal(classifyError(new Error(`${message}: ${secret}`)), reason);
  }
  assert.equal(
    classifyError({ type: "closed", message: secret }),
    "session-closed"
  );
  assert.equal(
    classifyError({ type: "crashed", message: secret }),
    "session-crashed"
  );
  assert.equal(classifyError(new Error(secret)), "unclassified-redacted");
});

test("hosting mutation detection examines code without retaining its arguments", () => {
  const params = {
    arguments: [
      {},
      {},
      {},
      {
        value:
          "async fields => { const {config} = await import('/src/stores/config-valtio.ts'); Object.assign(config.hosting, fields); }",
      },
      { value: { accessToken: secret } },
    ],
  };
  assert.equal(isHostingMutation("Runtime.callFunctionOn", params), true);
  assert.equal(
    isHostingMutation("Runtime.callFunctionOn", {
      arguments: [{ value: secret }],
    }),
    false
  );
  assert.equal(isHostingMutation("Network.requestWillBeSent", params), false);
});

test("a collected promise is recorded without inventing navigation or context lifecycle", async () => {
  const records = [];
  class Session {
    constructor() {
      this._sessionId = frameId;
    }
    send() {
      return this.result;
    }
    _onMessage(message) {
      this.message = message;
      return "message-result";
    }
    dispose() {
      this.disposed = true;
      return "dispose-result";
    }
  }
  instrument(Session, (event, data) => records.push({ event, ...data }));
  const session = new Session();
  const failure = new Error(
    `Protocol error (Runtime.callFunctionOn): Promise was collected ${secret}`
  );
  session.result = Promise.reject(failure);
  const params = {
    arguments: [
      {},
      {},
      {},
      { value: "fields => Object.assign(config.hosting, fields)" },
      { value: { accessToken: secret } },
    ],
  };
  const returned = session.send("Runtime.callFunctionOn", params);
  assert.equal(
    returned,
    session.result,
    "instrumentation must return the original promise"
  );
  await assert.rejects(returned, (error) => error === failure);
  assert.deepEqual(
    records.map(({ event }) => event),
    [
      "changeHosting.start",
      "Runtime.callFunctionOn.error",
      "changeHosting.failed",
    ]
  );
  assert.equal(records[1].reason, "promise-collected");
  assert.equal(
    records.some(({ event }) => /executionContext|frameNavigated/.test(event)),
    false
  );
  assert.equal(JSON.stringify(records).includes(secret), false);
  assert.equal(
    session._onMessage({
      method: "Runtime.consoleAPICalled",
      params: { args: secret },
    }),
    "message-result"
  );
  assert.equal(records.length, 3);
  assert.equal(session.dispose(), "dispose-result");
  assert.equal(records.at(-1).event, "Session.dispose");
  assert.equal(session.disposed, true);
});

test("instrumentation preserves successful calls and records actual lifecycle independently", async () => {
  const records = [];
  class Session {
    constructor() {
      this._sessionId = frameId;
    }
    send() {
      return Promise.resolve("original-result");
    }
    _onMessage() {}
    dispose() {}
  }
  instrument(Session, (event, data) => records.push({ event, ...data }));
  instrument(Session, () => assert.fail("installation is idempotent"));
  const session = new Session();
  assert.equal(
    await session.send("Runtime.evaluate", {
      expression: "Object.assign(config.hosting, fields)",
      accessToken: secret,
    }),
    "original-result"
  );
  session._onMessage({
    method: "Runtime.executionContextsCleared",
    params: { token: secret },
  });
  assert.deepEqual(
    records.map(({ event }) => event),
    [
      "changeHosting.start",
      "changeHosting.complete",
      "Runtime.executionContextsCleared",
    ]
  );
  assert.equal(JSON.stringify(records).includes(secret), false);
});

test("the pinned installed Playwright exposes the expected diagnostics interface", () => {
  assert.deepEqual(
    install(() => {}),
    { playwrightVersion: "1.56.1" }
  );
});
