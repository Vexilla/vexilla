"use strict";
const assert = require("node:assert/strict");

function checkOutcomes(jobResult, failures) {
  assert.equal(
    jobResult,
    "success",
    `Release orchestration ${jobResult}; inspect its configuration or transport failure`
  );
  assert(Array.isArray(failures), "Invalid group failure output");
  for (const failure of failures) {
    assert(
      typeof failure.group === "string" &&
        typeof failure.phase === "string" &&
        typeof failure.message === "string",
      "Invalid group diagnostic"
    );
  }
  assert.equal(
    failures.length,
    0,
    failures.map((f) => `${f.group} (${f.phase}): ${f.message}`).join("\n")
  );
}

if (require.main === module) {
  try {
    checkOutcomes(
      process.env.RELEASE_JOB_RESULT,
      JSON.parse(process.env.RELEASE_FAILURES || "[]")
    );
    console.log(
      "All managed release groups passed policy and generation checks."
    );
  } catch (error) {
    const message = error.message
      .replace(/%/g, "%25")
      .replace(/\r/g, "%0D")
      .replace(/\n/g, "%0A");
    console.error(`::error title=SDK release policy outcomes::${message}`);
    process.exitCode = 1;
  }
}
module.exports = { checkOutcomes };
