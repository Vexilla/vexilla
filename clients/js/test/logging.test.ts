import test from "node:test";
import assert from "node:assert/strict";
import { VexillaClient } from "../src/client";
import { VexillaError } from "../src/errors";

test("diagnostics are opt-in and do not expose transport or instance data", async () => {
  const diagnostics: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...arguments_) => diagnostics.push(arguments_.join(" "));
  console.warn = (...arguments_) => diagnostics.push(arguments_.join(" "));
  try {
    for (const showLogs of [false, true]) {
      diagnostics.length = 0;
      const client = new VexillaClient(
        {
          baseUrl: "https://user:private-token@contract",
          environment: "prod",
          customInstanceId: "private-instance",
        },
        showLogs
      );
      const manifest = await client.getManifest(async () => ({
        version: "v1",
        groups: [],
      }));
      await client.setManifest(manifest);
      await assert.rejects(
        client.getManifest(async () => {
          throw new Error("private-callback-error");
        }),
        (error: VexillaError) => error.kind === "fetch"
      );
      await assert.rejects(
        client.setManifest({ ...manifest, version: "invalid" } as any),
        (error: VexillaError) => error.kind === "validation"
      );
      await assert.rejects(
        client.getFlags("missing", async () => undefined as any)
      );
      assert.equal(client.safeShould("missing", "missing"), false);
      if (showLogs) {
        assert.ok(
          diagnostics.includes(
            "vexilla operation=manifest.fetch outcome=success"
          )
        );
        assert.ok(
          diagnostics.includes(
            "vexilla operation=manifest.install outcome=success"
          )
        );
        assert.ok(
          diagnostics.includes(
            "vexilla operation=manifest.fetch outcome=failure"
          )
        );
        assert.ok(
          diagnostics.includes(
            "vexilla operation=manifest.install outcome=failure"
          )
        );
        assert.ok(
          diagnostics.includes("vexilla operation=group.fetch outcome=failure")
        );
        assert.ok(
          diagnostics.every((diagnostic) => !diagnostic.includes("private-"))
        );
      } else {
        assert.deepEqual(diagnostics, []);
      }
    }
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
});
