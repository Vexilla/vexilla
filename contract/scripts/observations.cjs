const { isDeepStrictEqual } = require("node:util");

function requiredRuntimes(sdk) {
  return sdk === "lua"
    ? require("../lua-toolchain.json").runtimes.map((runtime) => runtime.id)
    : ["native"];
}
function checkObservations(sdk, cases, result) {
  if (
    !cases.length ||
    new Set(cases.map((sample) => sample.id)).size !== cases.length
  ) {
    throw Error("Empty or duplicate expected cases");
  }
  if (
    result?.protocol !== 1 ||
    result.sdk !== sdk ||
    !Array.isArray(result.runs)
  ) {
    throw Error("Missing or incompatible native observations: " + sdk);
  }
  const runtimes = requiredRuntimes(sdk);
  if (result.runs.length !== runtimes.length) {
    throw Error("Missing or duplicate runtime observations: " + sdk);
  }
  const coverage = [];
  for (const runtime of runtimes) {
    const matches = result.runs.filter((run) => run.runtime === runtime);
    if (matches.length !== 1) {
      throw Error("Missing or duplicate runtime: " + runtime);
    }
    const observations = matches[0].observations;
    if (!Array.isArray(observations) || observations.length !== cases.length) {
      throw Error("Incomplete native case coverage: " + runtime);
    }
    const byId = new Map(
      observations.map((observation) => [observation.caseId, observation])
    );
    if (byId.size !== cases.length) {
      throw Error("Duplicate native case IDs: " + runtime);
    }
    for (const sample of cases) {
      const observation = byId.get(sample.id);
      if (
        !observation ||
        !isDeepStrictEqual(observation.outcome, sample.expected)
      ) {
        throw Error(`Observation mismatch: ${sdk}/${runtime}/${sample.id}`);
      }
    }
    coverage.push({
      runtime,
      caseIds: cases.map((sample) => sample.id).sort(),
    });
  }
  return coverage;
}
function checkCoverage(sdk, caseIds, coverage) {
  const cases = caseIds.map((id) => ({ id, expected: { value: true } }));
  const result = {
    protocol: 1,
    sdk,
    runs: (coverage || []).map((run) => ({
      runtime: run.runtime,
      observations: (run.caseIds || []).map((caseId) => ({
        caseId,
        outcome: { value: true },
      })),
    })),
  };
  checkObservations(sdk, cases, result);
}
module.exports = { requiredRuntimes, checkObservations, checkCoverage };
