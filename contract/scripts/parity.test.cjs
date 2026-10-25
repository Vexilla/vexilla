const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { mutate, readVectors } = require("./vectors.cjs");
const {
  validatePublication,
} = require("../../packages/publishing/dist/index.js");
const parity = require("../parity.json");
const compatibility = require("../compatibility.json");

// Arbitrary-precision arithmetic is intentionally independent of native SDK hash code.
function hash(text) {
  let value = 2166136261n;
  for (const byte of Buffer.from(text, "utf8")) {
    value = ((value ^ BigInt(byte)) * 16777619n) & 0xffffffffn;
  }
  return Number(value);
}
test("literal UTF-8 and gradual vectors agree with independent integer arithmetic", () => {
  for (const sample of parity.hashes) {
    assert.equal(hash(sample.text), sample.expected.value, sample.id);
  }
  for (const sample of parity.gradual) {
    const bucket =
      ((hash(String(sample.instance)) * sample.seed) % 1000) / 1000;
    assert.deepEqual(
      { bucket, enabled: bucket < sample.threshold },
      sample.expected.value,
      sample.id
    );
  }
  const fractional = parity.gradual.find(
    (sample) => sample.id === "gradual/fractional-truncation"
  );
  assert.equal(fractional.expected.value.bucket, 0.19072000002861023);
  assert.equal(fractional.expected.value.enabled, false);
  assert.equal(
    (Math.floor(hash(fractional.instance) * fractional.seed) % 1000) / 1000 <
      fractional.threshold,
    true
  );
});
test("numeric ID literals use ECMAScript binary64 serialization", () => {
  for (const sample of parity.numbers) {
    assert.deepEqual(
      {
        text: JSON.stringify(sample.instance),
        hash: hash(JSON.stringify(sample.instance)),
      },
      sample.expected.value,
      sample.id
    );
  }
});
test("schedule literals agree with independent arbitrary-precision UTC intervals", () => {
  const day = 86400000n;
  const mod = (t) => ((t % day) + day) % day;
  const midnight = (t) => t - mod(t);
  for (const sample of parity.schedules) {
    const s = sample.schedule;
    const now = BigInt(sample.now);
    let active = true;
    if (sample.scheduleType !== "") {
      active =
        now >= midnight(BigInt(s.start)) && now < midnight(BigInt(s.end)) + day;
      if (s.timeType === "start/end") {
        active &&=
          now >= midnight(BigInt(s.start)) + BigInt(s.startTime) &&
          now <= midnight(BigInt(s.end)) + BigInt(s.endTime);
      } else if (s.timeType === "daily") {
        const start = mod(BigInt(s.startTime));
        const end = mod(BigInt(s.endTime));
        const time = mod(now);
        active &&=
          start <= end
            ? time >= start && time <= end
            : time >= start || time <= end;
      }
    }
    assert.equal(active, sample.expected.value, sample.id);
  }
});
test("validation literals agree with the existing publisher without repairing inputs", () => {
  const dir = path.resolve(
    process.env.VEXILLA_CONTRACT_DIR || ".contract-artifacts"
  );
  const read = (file) =>
    JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const source = {
    manifest: read("manifest.json"),
    groups: { "contract-group": read("contract-group.json") },
  };
  for (const sample of parity.validation) {
    const candidate = mutate(structuredClone(source), sample.mutations);
    assert.equal(
      validatePublication(candidate.manifest, candidate.groups).success,
      sample.expected.value === true,
      sample.id
    );
  }
  assert.ok(readVectors(dir).length > 400);
});
test("publisher normalization and timezone compatibility literals have not drifted", () => {
  const Case = require("../../clients/js/node_modules/case");
  for (const sample of compatibility.aliases) {
    assert.equal(Case.kebab(sample.name), sample.alias, sample.name);
  }
  for (const timezone of compatibility.timezone.identifiers) {
    assert.doesNotThrow(
      () => new Intl.DateTimeFormat("en", { timeZone: timezone }),
      timezone
    );
  }
  for (const sample of parity.timezones) {
    let valid = true;
    try {
      new Intl.DateTimeFormat("en", { timeZone: sample.timezone });
    } catch {
      valid = false;
    }
    assert.equal(valid, sample.expected.value, sample.id);
  }
});
