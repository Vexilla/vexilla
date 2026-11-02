"use strict";

const sharedJsFiles = new Set(["packages/publishing/src/validation.ts"]);
const jsValidationFile = "clients/js/src/validation.ts";

const { managedComponents } = require("./release-policy.cjs");

function hasSharedJsReleaseInput(files, inventory) {
  if (inventory && !managedComponents(inventory).some((c) => c.id === "js")) {
    return false;
  }
  return files.some((file) => sharedJsFiles.has(file));
}

// Release Please splits commits by configured package directories. The SDK
// bundles this shared validator, so count its changes as JS input without
// creating a separately versioned publishing package or changing commit data.
function applyReleaseInputs(github, inventory) {
  const scm = Object.create(github);
  scm.mergeCommitIterator = async function* (...args) {
    for await (const commit of github.mergeCommitIterator(...args)) {
      const relevant =
        !inventory ||
        (commit.files || []).some((file) =>
          managedComponents(inventory).some((c) =>
            file.startsWith(`${c.directory}/`)
          )
        ) ||
        hasSharedJsReleaseInput(commit.files || [], inventory);
      if (relevant && /\bRelease-As\s*:/i.test(commit.message || "")) {
        throw new Error(
          "Release-As overrides are unsupported; reconcile reviewed Conventional Commit inputs"
        );
      }
      if (commit.files && hasSharedJsReleaseInput(commit.files, inventory)) {
        yield {
          ...commit,
          files: [...new Set([...commit.files, jsValidationFile])],
        };
      } else {
        yield commit;
      }
    }
  };
  return scm;
}

module.exports = { applyReleaseInputs, hasSharedJsReleaseInput };
