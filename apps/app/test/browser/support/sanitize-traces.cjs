const fs = require("node:fs/promises");
const { createWriteStream } = require("node:fs");
const { createRequire } = require("node:module");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { pipeline } = require("node:stream/promises");

// Reuse the ZIP implementation of the pinned Playwright installation.
const fromTest = createRequire(require.resolve("@playwright/test"));
const fromPlaywright = createRequire(fromTest.resolve("playwright"));
const { yauzl, yazl } = fromPlaywright("playwright-core/lib/zipBundle");
const { methodMetainfo } = fromPlaywright("playwright-core/lib/utils");
const testMethods = new Set([
  "hook",
  "fixture",
  "expect",
  "test.step",
  "test",
  "pw:api",
]);
const lifecycleEvents = new Set([
  "BrowserContext.page",
  "BrowserContext.pageClosed",
  "Page.close",
  "Page.crash",
]);

function classifiedError(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (/Execution context was destroyed/i.test(message)) {
    return { name: "Error", message: "Execution context was destroyed" };
  }
  if (
    /Target (?:page, context or browser has been closed|closed)|Browser has been closed|browser has disconnected/i.test(
      message
    )
  ) {
    return { name: "Error", message: "Page, context or browser was closed" };
  }
  if (/timeout|timed out/i.test(message)) {
    return { name: "TimeoutError", message: "Operation timed out" };
  }
  return { name: "Error", message: "Error details removed" };
}

function projectTrace(text) {
  const identifiers = new Map();
  const calls = new Set();
  let hasContext = false;
  const id = (value) => {
    if (typeof value !== "string" && typeof value !== "number") {
      return undefined;
    }
    if (!identifiers.has(value)) {
      identifiers.set(value, `id@${identifiers.size}`);
    }
    return identifiers.get(value);
  };
  const number = (value) => (Number.isFinite(value) ? value : 0);
  const projected = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const event = JSON.parse(line);
    if (!event || typeof event !== "object") {
      continue;
    }
    let safe;
    if (event.type === "context-options") {
      // The repository pins Playwright 1.56.1, whose trace format is version 8.
      // Reject future formats rather than accidentally retaining new payload fields.
      if (event.version !== 8) {
        throw new Error("Unsupported trace format");
      }
      hasContext = true;
      safe = {
        type: "context-options",
        version: 8,
        origin: event.origin === "testRunner" ? "testRunner" : "library",
        browserName: ["chromium", "firefox", "webkit"].includes(
          event.browserName
        )
          ? event.browserName
          : "",
        platform: ["linux", "darwin", "win32"].includes(event.platform)
          ? event.platform
          : "unknown",
        options: {},
        wallTime: number(event.wallTime),
        monotonicTime: number(event.monotonicTime),
        sdkLanguage: "javascript",
        contextId: id(event.contextId),
        title: "Sanitized browser diagnostics",
      };
      if (/^\d+\.\d+\.\d+$/.test(event.playwrightVersion ?? "")) {
        safe.playwrightVersion = event.playwrightVersion;
      }
    } else if (event.type === "before") {
      const callId = id(event.callId);
      if (!callId) {
        continue;
      }
      calls.add(event.callId);
      const known =
        methodMetainfo.has(`${event.class}.${event.method}`) ||
        (event.class === "Test" && testMethods.has(event.method));
      const className = known ? event.class : "Test";
      const method = known ? event.method : "redacted";
      safe = {
        type: "before",
        callId,
        startTime: number(event.startTime),
        class: className,
        method,
        apiName: `${className}.${method}`,
        title: `${className}.${method}`,
        params: {},
        stepId: id(event.stepId),
        parentId: id(event.parentId),
        pageId: id(event.pageId),
      };
    } else if (event.type === "after" && calls.has(event.callId)) {
      safe = {
        type: "after",
        callId: id(event.callId),
        endTime: number(event.endTime),
      };
      if (event.error) {
        safe.error = classifiedError(event.error);
      }
    } else if (
      event.type === "event" &&
      lifecycleEvents.has(`${event.class}.${event.method}`)
    ) {
      safe = {
        type: "event",
        class: event.class,
        method: event.method,
        time: number(event.time),
        pageId: id(event.pageId),
        params: { pageId: id(event.params?.pageId) },
      };
    }
    if (safe) {
      projected.push(JSON.stringify(safe));
    }
  }
  if (!hasContext) {
    throw new Error("Missing trace context");
  }
  return projected.join("\n") + "\n";
}

function readTraceEntries(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (error, zip) => {
      if (error) {
        return reject(error);
      }
      const entries = [];
      const fail = (error) => {
        zip.close();
        reject(error);
      };
      zip.on("error", fail);
      zip.on("end", () => resolve(entries));
      zip.on("entry", (entry) => {
        if (!entry.fileName.endsWith(".trace")) {
          return zip.readEntry();
        }
        zip.openReadStream(entry, async (error, stream) => {
          if (error) {
            return fail(error);
          }
          try {
            const buffers = [];
            for await (const buffer of stream) {
              buffers.push(buffer);
            }
            // Entry names, including source paths, are also untrusted data.
            entries.push(projectTrace(Buffer.concat(buffers).toString("utf8")));
            zip.readEntry();
          } catch (error) {
            fail(error);
          }
        });
      });
      zip.readEntry();
    });
  });
}

async function sanitizeZip(file) {
  const temporary = `${file}.${randomUUID()}.sanitized`;
  try {
    const entries = await readTraceEntries(file);
    if (!entries.length) {
      throw new Error("Missing trace entries");
    }
    const zip = new yazl.ZipFile();
    const written = pipeline(
      zip.outputStream,
      createWriteStream(temporary, { flags: "wx", mode: 0o600 })
    );
    entries.forEach((text, index) =>
      zip.addBuffer(Buffer.from(text), `${index}.trace`)
    );
    zip.end();
    await written;
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

async function sanitizeTraces(directory) {
  try {
    async function visit(current) {
      for (const entry of await fs.readdir(current, { withFileTypes: true })) {
        const file = path.join(current, entry.name);
        if (
          entry.isDirectory() &&
          !entry.name.startsWith(".playwright-artifacts-")
        ) {
          await visit(file);
        } else if (entry.isFile() && entry.name === "trace.zip") {
          await sanitizeZip(file);
        } else {
          // A crashed worker can leave raw traces, resources and screenshots.
          // Only rebuilt trace ZIPs may cross this upload boundary.
          await fs.rm(file, { recursive: true, force: true });
        }
      }
    }
    try {
      await fs.access(directory);
    } catch (error) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }
    await visit(directory);
  } catch {
    // Fail closed across the entire upload directory, including unvisited traces.
    await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
    throw new Error(
      "Browser trace sanitization failed; browser artifacts must not be uploaded"
    );
  }
}

module.exports = { sanitizeTraces };
