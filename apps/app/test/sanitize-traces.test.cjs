const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { createWriteStream } = require("node:fs");
const { createRequire } = require("node:module");
const os = require("node:os");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { test } = require("node:test");
const { sanitizeTraces } = require("./browser/support/sanitize-traces.cjs");
const fromTest = createRequire(require.resolve("@playwright/test"));
const fromPlaywright = createRequire(fromTest.resolve("playwright"));
const { yauzl, yazl } = fromPlaywright("playwright-core/lib/zipBundle");

async function temporaryDirectory(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "vexilla-trace-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

async function writeZip(file, entries) {
  const zip = new yazl.ZipFile();
  const written = pipeline(zip.outputStream, createWriteStream(file));
  for (const [name, text] of Object.entries(entries))
    zip.addBuffer(Buffer.from(text), name);
  zip.end();
  await written;
}

async function readZip(file) {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error);
      const entries = {};
      zip.on("error", reject);
      zip.on("end", () => resolve(entries));
      zip.on("entry", (entry) =>
        zip.openReadStream(entry, async (error, stream) => {
          if (error) return reject(error);
          try {
            const buffers = [];
            for await (const buffer of stream) buffers.push(buffer);
            entries[entry.fileName] = Buffer.concat(buffers).toString("utf8");
            zip.readEntry();
          } catch (error) {
            reject(error);
          }
        })
      );
      zip.readEntry();
    });
  });
}

const context = {
  type: "context-options",
  version: 8,
  origin: "library",
  browserName: "chromium",
  platform: "linux",
  wallTime: 1000,
  monotonicTime: 10,
};
const lines = (events) =>
  events.map((event) => JSON.stringify(event)).join("\n") + "\n";

test("retains API timing and classified errors while excluding every arbitrary trace payload", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "trace.zip");
  const poison = "DO_NOT_UPLOAD_CREDENTIAL_7b328";
  await writeZip(file, {
    [`${poison}.trace`]: lines([
      {
        ...context,
        title: poison,
        contextId: poison,
        channel: poison,
        playwrightVersion: poison,
        testIdAttributeName: poison,
        options: {
          httpCredentials: { password: poison },
          extraHTTPHeaders: { authorization: poison },
        },
      },
      {
        type: "before",
        callId: poison,
        stepId: poison,
        pageId: poison,
        startTime: 12,
        class: "Frame",
        method: "evaluateExpression",
        title: poison,
        apiName: poison,
        params: { expression: poison, arg: poison },
        stack: [{ file: poison }],
      },
      { type: "log", callId: poison, time: 13, message: poison },
      {
        type: "after",
        callId: poison,
        endTime: 15,
        result: poison,
        error: {
          name: poison,
          message: `Execution context was destroyed ${poison}`,
          stack: poison,
        },
        attachments: [
          { name: poison, base64: Buffer.from(poison).toString("base64") },
        ],
      },
      {
        type: "event",
        class: "BrowserContext",
        method: "pageClosed",
        time: 16,
        pageId: poison,
        params: { pageId: poison, url: poison },
      },
      {
        type: "event",
        class: "BrowserContext",
        method: "pageError",
        time: 16,
        params: { error: poison },
      },
      {
        type: "before",
        callId: `${poison}-unknown`,
        startTime: 17,
        class: poison,
        method: poison,
        params: poison,
      },
      {
        type: "after",
        callId: `${poison}-unknown`,
        endTime: 18,
        error: { message: poison },
      },
      { type: "stdout", text: poison },
      { type: "stderr", base64: Buffer.from(poison).toString("base64") },
      { type: "frame-snapshot", snapshot: { html: poison } },
      { type: "screencast-frame", sha1: poison },
      { type: "error", error: { message: poison } },
    ]),
    "0.network": lines([
      {
        request: {
          headers: { authorization: poison },
          postData: poison,
          url: poison,
        },
        response: { content: poison },
      },
    ]),
    "0.stacks": poison,
    [`resources/${poison}`]: poison,
    "resources/src@source.txt": poison,
  });
  await sanitizeTraces(directory);
  const entries = await readZip(file);
  assert.deepEqual(Object.keys(entries), ["0.trace"]);
  assert.equal(JSON.stringify(entries).includes(poison), false);
  assert.equal(
    JSON.stringify(entries).includes(Buffer.from(poison).toString("base64")),
    false
  );
  const events = entries["0.trace"].trim().split("\n").map(JSON.parse);
  assert.equal(events[1].class, "Frame");
  assert.equal(events[1].method, "evaluateExpression");
  assert.equal(events[1].startTime, 12);
  assert.deepEqual(events[1].params, {});
  assert.equal(events[2].callId, events[1].callId);
  assert.equal(events[2].endTime, 15);
  assert.deepEqual(events[2].error, {
    name: "Error",
    message: "Execution context was destroyed",
  });
  assert.equal(events[3].method, "pageClosed");
  assert.equal(events[4].method, "redacted");
  assert.equal(events[5].error.message, "Error details removed");
  assert.deepEqual(await fs.readdir(directory), ["trace.zip"]);
});

test("removes error contexts and raw crash leftovers from the entire artifact directory", async (t) => {
  const directory = await temporaryDirectory(t);
  const caseDirectory = path.join(directory, "failed-test");
  const rawDirectory = path.join(
    directory,
    ".playwright-artifacts-0",
    "traces"
  );
  await fs.mkdir(caseDirectory, { recursive: true });
  await fs.mkdir(rawDirectory, { recursive: true });
  await fs.writeFile(
    path.join(caseDirectory, "error-context.md"),
    "credential"
  );
  await fs.writeFile(path.join(caseDirectory, "screenshot.png"), "credential");
  await fs.writeFile(path.join(rawDirectory, "raw.trace"), "credential");
  await fs.writeFile(path.join(rawDirectory, "worker.zip"), "credential");
  await writeZip(path.join(caseDirectory, "trace.zip"), {
    "test.trace": lines([context]),
  });
  await sanitizeTraces(directory);
  assert.deepEqual(await fs.readdir(directory), ["failed-test"]);
  assert.deepEqual(await fs.readdir(caseDirectory), ["trace.zip"]);
  assert.deepEqual(
    Object.keys(await readZip(path.join(caseDirectory, "trace.zip"))),
    ["0.trace"]
  );
});

test("malformed or unsupported traces fail closed and remove even unvisited artifacts", async (t) => {
  for (const content of [
    "not-json",
    lines([{ ...context, version: 999 }]),
    lines([{ type: "before", callId: "1" }]),
  ]) {
    const directory = await temporaryDirectory(t);
    await fs.mkdir(path.join(directory, "a"));
    await fs.mkdir(path.join(directory, "z"));
    await writeZip(path.join(directory, "a", "trace.zip"), {
      "0.trace": content,
    });
    await fs.writeFile(
      path.join(directory, "z", "trace.zip"),
      "raw credential"
    );
    await assert.rejects(sanitizeTraces(directory), {
      message:
        "Browser trace sanitization failed; browser artifacts must not be uploaded",
    });
    await assert.rejects(fs.access(directory), { code: "ENOENT" });
  }
});

test("a missing artifact directory is harmless", async (t) => {
  const directory = await temporaryDirectory(t);
  await sanitizeTraces(path.join(directory, "absent"));
});

test("closure and timeout classifications preserve no raw error details", async (t) => {
  const directory = await temporaryDirectory(t);
  const file = path.join(directory, "trace.zip");
  await writeZip(file, {
    "test.trace": lines([
      context,
      {
        type: "before",
        callId: "closed",
        startTime: 1,
        class: "Frame",
        method: "goto",
      },
      {
        type: "after",
        callId: "closed",
        endTime: 2,
        error: {
          message:
            "Target page, context or browser has been closed: secret-one",
        },
      },
      {
        type: "before",
        callId: "timeout",
        startTime: 3,
        class: "Frame",
        method: "goto",
      },
      {
        type: "after",
        callId: "timeout",
        endTime: 4,
        error: { message: "page.goto: Timeout 30000ms exceeded at secret-two" },
      },
    ]),
  });
  await sanitizeTraces(directory);
  const events = (await readZip(file))["0.trace"]
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.deepEqual(
    events.filter((event) => event.error).map((event) => event.error),
    [
      { name: "Error", message: "Page, context or browser was closed" },
      { name: "TimeoutError", message: "Operation timed out" },
    ]
  );
});
