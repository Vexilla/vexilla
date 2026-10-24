// Test-data plumbing only. Product evaluation belongs in the native SDKs.
const fs = require("node:fs");
const path = require("node:path");

const sections = [
  "hashes",
  "numbers",
  "gradual",
  "schedules",
  "validation",
  "operations",
  "aliases",
  "timezones",
];
function readVectors(dir) {
  const parity = JSON.parse(
    fs.readFileSync(path.join(dir, "parity.json"), "utf8")
  );
  if (parity.version !== 1) {
    throw Error("Unsupported parity vector version");
  }
  const cases = sections.flatMap((section) => parity[section] || []);
  const expected = JSON.parse(
    fs.readFileSync(path.join(dir, "expected.json"), "utf8")
  );
  for (const env of expected.environments) {
    for (const lookup of ["id", "name", "alias"]) {
      for (const [index, sample] of expected.cases.entries()) {
        cases.push({
          id: `publication/${env.id}/${lookup}/${index}`,
          expected: { value: env[sample.expectedKey] },
        });
      }
      for (const feature of [...expected.scheduled, "scheduled-active"]) {
        cases.push({
          id: `publication/${env.id}/${lookup}/schedule/${feature}`,
          expected: { value: feature === "scheduled-active" },
        });
      }
    }
  }
  const ids = cases.map((sample) => sample.id);
  if (!ids.length || new Set(ids).size !== ids.length) {
    throw Error("Empty or duplicate contract case IDs");
  }
  for (const sample of cases) {
    const outcome = sample.expected;
    if (
      !outcome ||
      Object.keys(outcome).length !== 1 ||
      !(
        "value" in outcome ||
        ["validation", "lookup", "kind", "instance", "fetch"].includes(
          outcome.error
        )
      )
    ) {
      throw Error("Invalid expected outcome: " + sample.id);
    }
  }
  return cases;
}

function tokens(pointer) {
  if (!pointer.startsWith("/")) {
    throw Error("Expected an absolute JSON pointer: " + pointer);
  }
  return pointer
    .slice(1)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
}
function at(value, pointer) {
  for (const key of tokens(pointer)) {
    if (!Object.hasOwn(value, key)) {
      throw Error("Mutation source does not exist: " + pointer);
    }
    value = value[key];
  }
  return value;
}
function mutate(value, mutations) {
  for (const mutation of mutations) {
    const keys = tokens(mutation.path);
    const key = keys.pop();
    let parent = value;
    for (const token of keys) {
      if (!Object.hasOwn(parent, token)) {
        throw Error("Mutation parent does not exist: " + mutation.path);
      }
      parent = parent[token];
    }
    if (mutation.op === "remove") {
      if (!Object.hasOwn(parent, key)) {
        throw Error("Mutation target does not exist: " + mutation.path);
      }
      if (Array.isArray(parent)) {
        parent.splice(Number(key), 1);
      } else {
        delete parent[key];
      }
    } else if (mutation.op === "copy") {
      Object.defineProperty(parent, key, {
        value: structuredClone(at(value, mutation.from)),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else if (mutation.op === "set") {
      const item =
        "wireString" in mutation
          ? JSON.parse(mutation.wireString)
          : "nativeNumber" in mutation
          ? { NaN, Infinity, "-Infinity": -Infinity }[mutation.nativeNumber]
          : structuredClone(mutation.value);
      if (
        "nativeNumber" in mutation &&
        !["NaN", "Infinity", "-Infinity"].includes(mutation.nativeNumber)
      ) {
        throw Error("Unknown native number");
      }
      Object.defineProperty(parent, key, {
        value: item,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      throw Error("Unknown mutation: " + mutation.op);
    }
  }
  return value;
}
module.exports = { readVectors, mutate, sections };
