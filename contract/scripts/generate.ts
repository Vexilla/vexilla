import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { applyContractActions } from "../actions";
import { serializePublication } from "../../packages/publishing/src";
const root = resolve(__dirname, "../..");
const input = JSON.parse(
  readFileSync(resolve(root, "contract/authoring.json"), "utf8")
);
applyContractActions(
  input,
  JSON.parse(
    readFileSync(resolve(root, "contract/editing-actions.json"), "utf8")
  )
);
const result = serializePublication(input);
if (!result.success) {
  throw new Error(JSON.stringify(result.issues, null, 2));
}
const repeat = serializePublication(input);
if (JSON.stringify(result) !== JSON.stringify(repeat)) {
  throw new Error("Non-deterministic production serialization");
}
const out = resolve(
  process.env.VEXILLA_CONTRACT_DIR || resolve(root, ".contract-artifacts")
);
mkdirSync(out, { recursive: true });
const hashes: Record<string, string> = {};
for (const file of [
  ...result.files,
  {
    filePath: "expected.json",
    content: readFileSync(resolve(root, "contract/expected.json"), "utf8"),
  },
]) {
  writeFileSync(resolve(out, file.filePath), file.content);
  hashes[file.filePath] = createHash("sha256")
    .update(file.content)
    .digest("hex");
}
writeFileSync(
  resolve(out, "metadata.json"),
  JSON.stringify(
    {
      revision:
        process.env.GITHUB_SHA ||
        execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: root,
          encoding: "utf8",
        }).trim(),
      referenceClock: 1735689600000,
      hashes,
    },
    null,
    2
  )
);
console.log(JSON.stringify({ out, hashes }, null, 2));
