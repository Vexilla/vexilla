const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const PINNED_PLAYWRIGHT_VERSION = "1.56.1";
const installation = Symbol.for("vexilla.protocol-diagnostics");
const appRoot = path.resolve(__dirname, "../../..");
const localPaths = new Set([
  "/",
  "/index.html",
  "/configuration",
  "/publish",
  "/@vite/client",
  "/@react-refresh",
  ...["github", "gitlab", "bitbucket"].map(
    (provider) => `/auth/callback/${provider}`
  ),
]);
// Only actual source filenames may survive URL sanitization. No file contents
// or values from the browser are read to build this whitelist.
for (const file of fs.readdirSync(path.join(appRoot, "src"), {
  recursive: true,
  withFileTypes: true,
})) {
  if (file.isFile()) {
    const parent = file.parentPath ?? file.path;
    localPaths.add(
      `/src/${path
        .relative(path.join(appRoot, "src"), path.join(parent, file.name))
        .split(path.sep)
        .join("/")}`
    );
  }
}

function safeURL(value) {
  if (value === "about:blank") return value;
  if (typeof value !== "string") return "[redacted-url]";
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      return "[redacted-url]";
    // URL.origin excludes userinfo. Queries, fragments and external paths can
    // contain OAuth codes, credentials, repository names, or arbitrary values.
    const local = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
    return (
      url.origin +
      (local
        ? localPaths.has(url.pathname)
          ? url.pathname
          : "/[redacted]"
        : "")
    );
  } catch {
    return "[redacted-url]";
  }
}

function id(value) {
  return typeof value === "string" &&
    /^(?:[A-Fa-f0-9]{32}|\d+(?:\.\d+)*|)$/.test(value)
    ? value
    : "[redacted-id]";
}
function number(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}
function enumeration(value, allowed) {
  return allowed.includes(value) ? value : "other";
}
function stackFrames(stack, depth = 0) {
  if (!stack || depth > 3) return [];
  return [
    ...(Array.isArray(stack.callFrames)
      ? stack.callFrames.slice(0, 12).map((frame) => ({
          url: safeURL(frame.url),
          lineNumber: number(frame.lineNumber),
          columnNumber: number(frame.columnNumber),
        }))
      : []),
    ...stackFrames(stack.parent, depth + 1),
  ];
}

const navigationReasons = [
  "formSubmissionGet",
  "formSubmissionPost",
  "httpHeaderRefresh",
  "scriptInitiated",
  "metaTagRefresh",
  "pageBlockInterstitial",
  "reload",
  "anchorClick",
];

// A strict projection, rather than recursive redaction: new CDP fields never
// become diagnostics accidentally. In particular, never record source,
// function names, request headers/bodies, evaluation arguments or raw errors.
function projectEvent(method, params = {}) {
  switch (method) {
    case "Runtime.executionContextCreated": {
      const context = params.context ?? {};
      return {
        contextId: number(context.id),
        frameId: id(context.auxData?.frameId),
        isDefault: context.auxData?.isDefault === true,
        type: enumeration(context.auxData?.type, [
          "default",
          "isolated",
          "worker",
        ]),
      };
    }
    case "Runtime.executionContextDestroyed":
      return { contextId: number(params.executionContextId) };
    case "Runtime.executionContextsCleared":
    case "Inspector.targetCrashed":
      return {};
    case "Page.frameNavigated":
      return {
        frameId: id(params.frame?.id),
        parentId: id(params.frame?.parentId),
        loaderId: id(params.frame?.loaderId),
        url: safeURL(params.frame?.url),
        type: enumeration(params.type, [
          "Navigation",
          "BackForwardCacheRestore",
        ]),
      };
    case "Page.navigatedWithinDocument":
      return {
        frameId: id(params.frameId),
        url: safeURL(params.url),
        type: enumeration(params.navigationType, [
          "fragment",
          "historyApi",
          "other",
        ]),
      };
    case "Page.frameRequestedNavigation":
    case "Page.frameScheduledNavigation":
      return {
        frameId: id(params.frameId),
        url: safeURL(params.url),
        reason: enumeration(params.reason, navigationReasons),
        delay: number(params.delay),
        disposition: enumeration(params.disposition, [
          "currentTab",
          "newTab",
          "newWindow",
          "download",
        ]),
      };
    case "Network.requestWillBeSent":
      if (params.type !== "Document") return null;
      return {
        frameId: id(params.frameId),
        loaderId: id(params.loaderId),
        requestId: id(params.requestId),
        url: safeURL(params.request?.url),
        initiator: {
          type: enumeration(params.initiator?.type, [
            "parser",
            "script",
            "preload",
            "SignedExchange",
            "preflight",
            "other",
          ]),
          url:
            params.initiator?.url === undefined
              ? undefined
              : safeURL(params.initiator.url),
          lineNumber: number(params.initiator?.lineNumber),
          stack: stackFrames(params.initiator?.stack),
        },
      };
    case "Network.webSocketFrameReceived":
      try {
        const payload = JSON.parse(params.response?.payloadData);
        // Vite's reload path and error payload can contain arbitrary strings.
        if (payload?.type === "full-reload") return { type: "full-reload" };
      } catch {}
      return null;
    case "Inspector.detached":
      return {
        reason: enumeration(params.reason, [
          "target_closed",
          "render_process_gone",
          "replaced_with_devtools",
        ]),
      };
    case "Target.detachedFromTarget":
      return {
        detachedSessionId: id(params.sessionId),
        targetId: id(params.targetId),
      };
    case "Target.targetCrashed":
      return {
        targetId: id(params.targetId),
        errorCode: number(params.errorCode),
        status: enumeration(params.status, [
          "crashed",
          "killed",
          "abnormal",
          "oom",
        ]),
      };
    default:
      return null;
  }
}

function classifyError(error) {
  if (error?.type === "closed" || error?.type === "crashed")
    return `session-${error.type}`;
  const message = typeof error?.message === "string" ? error.message : "";
  for (const [text, reason] of [
    ["Promise was collected", "promise-collected"],
    ["Cannot find context with specified id", "context-missing"],
    ["Cannot find context with specified unique id", "context-missing"],
    ["Cannot find object with given id", "object-missing"],
    ["Could not find object with given id", "object-missing"],
    ["Execution context was destroyed", "context-destroyed"],
    ["Inspected target navigated or closed", "target-navigated-or-closed"],
    ["Object reference chain is too long", "serialization-depth"],
    ["Object couldn't be returned by value", "serialization-value"],
  ])
    if (message.includes(text)) return reason;
  return "unclassified-redacted";
}

function isHostingMutation(method, params) {
  if (method !== "Runtime.callFunctionOn" && method !== "Runtime.evaluate")
    return false;
  const source =
    method === "Runtime.evaluate"
      ? params?.expression
      : params?.arguments?.[3]?.value;
  return (
    typeof source === "string" &&
    /Object\.assign\s*\([^)]*\.hosting\b/.test(source)
  );
}

function instrument(CRSession, record) {
  if (CRSession.prototype[installation]) return;
  const send = CRSession.prototype.send;
  const onMessage = CRSession.prototype._onMessage;
  const dispose = CRSession.prototype.dispose;
  if (
    ![send, onMessage, dispose].every((method) => typeof method === "function")
  ) {
    throw new Error(
      "Pinned Playwright CRSession diagnostics interface changed"
    );
  }
  // Logging must never turn a successful protocol call into a rejected promise.
  const emit = (event, data) => {
    try {
      record(event, data);
    } catch {}
  };
  CRSession.prototype.send = function (method, params) {
    const sessionId = id(this._sessionId);
    const mutation = isHostingMutation(method, params);
    if (mutation) emit("changeHosting.start", { sessionId });
    const result = send.call(this, method, params);
    // Observe the original promise, returning it unchanged. This handler is
    // registered before crExecutionContext's rewriteError masks CDP failures.
    if (method === "Runtime.callFunctionOn" || method === "Runtime.evaluate") {
      result.then(
        () => {
          if (mutation) emit("changeHosting.complete", { sessionId });
        },
        (error) => {
          emit(`${method}.error`, { sessionId, reason: classifyError(error) });
          if (mutation) emit("changeHosting.failed", { sessionId });
        }
      );
    }
    return result;
  };
  CRSession.prototype._onMessage = function (message) {
    if (!message.id) {
      const projected = projectEvent(message.method, message.params);
      if (projected !== null)
        emit(message.method, { sessionId: id(this._sessionId), ...projected });
    }
    return onMessage.call(this, message);
  };
  CRSession.prototype.dispose = function (...args) {
    emit("Session.dispose", {
      sessionId: id(this._sessionId),
      crashed: this._crashed === true,
    });
    return dispose.apply(this, args);
  };
  CRSession.prototype[installation] = true;
}

function install(record) {
  const appRequire = createRequire(path.join(appRoot, "package.json"));
  const testRequire = createRequire(
    appRequire.resolve("@playwright/test/package.json")
  );
  const playwrightRequire = createRequire(
    testRequire.resolve("playwright/package.json")
  );
  const corePackage = playwrightRequire.resolve("playwright-core/package.json");
  const { version } = require(corePackage);
  if (version !== PINNED_PLAYWRIGHT_VERSION) {
    throw new Error(
      `Protocol diagnostics require Playwright ${PINNED_PLAYWRIGHT_VERSION}; installed ${version}`
    );
  }
  const { CRSession } = require(path.join(
    path.dirname(corePackage),
    "lib/server/chromium/crConnection.js"
  ));
  instrument(CRSession, record);
  return { playwrightVersion: version };
}

module.exports = {
  safeURL,
  projectEvent,
  classifyError,
  isHostingMutation,
  instrument,
  install,
};
