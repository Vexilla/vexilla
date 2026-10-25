"use strict";

const sharedJsFiles = new Set(["packages/publishing/src/validation.ts"]);
const jsValidationFile = "clients/js/src/validation.ts";

function hasSharedJsReleaseInput(files) {
  return files.some((file) => sharedJsFiles.has(file));
}

// Release Please splits commits by configured package directories. The SDK
// bundles this shared validator, so count its changes as JS input without
// creating a separately versioned publishing package or changing commit data.
function applyReleaseInputs(github) {
  const scm = Object.create(github);
  scm.mergeCommitIterator = async function* (...args) {
    for await (const commit of github.mergeCommitIterator(...args)) {
      if (commit.files && hasSharedJsReleaseInput(commit.files)) {
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
