import {
  ContractIssue,
  issue,
  pointer,
  validatePublication,
} from "@vexilla/types";
export * from "./editing";
export interface PublicationFile {
  filePath: string;
  content: string;
}
export type PublicationResult =
  | { success: true; files: PublicationFile[] }
  | { success: false; issues: ContractIssue[] };
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
/** Decimal editor strings only; never partial parses, truncation, or unsafe integers. */
export function editorNumber(input: unknown, integer: boolean): number {
  if (typeof input !== "number" && typeof input !== "string") {
    throw new Error("a finite decimal number");
  }
  if (typeof input === "string" && !numeric.test(input.trim())) {
    throw new Error("a complete finite decimal number");
  }
  const value = Number(input);
  if (!Number.isFinite(value)) {
    throw new Error("a finite number");
  }
  if (integer) {
    if (!Number.isSafeInteger(value)) {
      throw new Error("an integer in the JavaScript safe range");
    }
    if (typeof input === "string") {
      const [mantissa, exponent = "0"] = input.trim().toLowerCase().split("e");
      const decimals = (mantissa.split(".")[1] || "").length;
      const scale = decimals - Number(exponent);
      const digits = mantissa.replace(/^[+-]/, "").replace(".", "");
      // Check decimal arithmetic before Number could round a fractional input to an integer.
      if (scale > 0 && /[1-9]/.test(digits.slice(-scale))) {
        throw new Error("an integer without a fractional component");
      }
    }
  }
  return value;
}
const baseFields = [
  "name",
  "featureId",
  "featureType",
  "scheduleType",
  "schedule",
  "value",
];
function publicFeature(
  source: any,
  path: string,
  issues: ContractIssue[]
): any {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return source;
  }
  const fields = [
    ...baseFields,
    ...(source.featureType === "gradual" ? ["seed"] : []),
    ...(["selective", "value"].includes(source.featureType)
      ? ["valueType", ...(source.valueType === "number" ? ["numberType"] : [])]
      : []),
  ];
  const f: any = Object.fromEntries(
    fields.filter((k) => k in source).map((k) => [k, source[k]])
  );
  if (f.schedule && typeof f.schedule === "object") {
    f.schedule = Object.fromEntries(
      ["start", "end", "timezone", "timeType", "startTime", "endTime"]
        .filter((k) => k in f.schedule)
        .map((k) => [k, f.schedule[k]])
    );
  }
  const convert = (input: unknown, integer: boolean, fieldPath: string) => {
    try {
      return editorNumber(input, integer);
    } catch (e) {
      issues.push(issue(fieldPath, (e as Error).message));
      return input;
    }
  };
  if (f.featureType === "gradual") {
    if ("seed" in f) {
      f.seed = convert(f.seed, false, path + "/seed");
    }
    if ("value" in f) {
      f.value = convert(f.value, false, path + "/value");
    }
  }
  if (f.valueType === "number") {
    const integer = f.numberType === "int";
    if (f.featureType === "selective" && Array.isArray(f.value)) {
      f.value = f.value.map((v: unknown, i: number) =>
        convert(v, integer, `${path}/value/${i}`)
      );
    } else if (f.featureType === "value" && "value" in f) {
      f.value = convert(f.value, integer, path + "/value");
    }
  }
  return f;
}
function featureMap(features: any, path: string, issues: ContractIssue[]) {
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return features;
  }
  return Object.fromEntries(
    Object.entries(features).map(([id, f]) => [
      id,
      publicFeature(f, path + "/" + pointer(id), issues),
    ])
  );
}
/** The app and the corpus generator use this same immutable publication boundary. */
export function serializePublication(config: {
  groups: readonly unknown[];
}): PublicationResult {
  const issues: ContractIssue[] = [];
  if (!Array.isArray(config?.groups)) {
    return { success: false, issues: [issue("/groups", "an array of groups")] };
  }
  const entries: [string, any][] = [];
  const manifest = {
    version: "v1",
    groups: config.groups.map((raw: any, index) => {
      const g = raw || {};
      const id = g.groupId;
      const p = "/groups/" + pointer(String(id ?? index));
      if (entries.some(([key]) => key === id)) {
        issues.push(issue(p + "/groupId", "a unique group ID"));
      }
      const environments =
        g.environments &&
        typeof g.environments === "object" &&
        !Array.isArray(g.environments)
          ? Object.fromEntries(
              Object.entries(g.environments).map(
                ([eid, env]: [string, any]) => [
                  eid,
                  env && {
                    name: env.name,
                    environmentId: env.environmentId,
                    features: featureMap(
                      env.features,
                      `${p}/environments/${pointer(eid)}/features`,
                      issues
                    ),
                  },
                ]
              )
            )
          : g.environments;
      entries.push([
        id,
        {
          name: g.name,
          groupId: id,
          meta: { version: "v1" },
          features: featureMap(g.features, p + "/features", issues),
          environments,
        },
      ]);
      return { name: g.name, groupId: id };
    }),
  };
  const groups = Object.fromEntries(entries);
  const validation = validatePublication(manifest, groups);
  issues.push(...validation.issues);
  if (issues.length) {
    return {
      success: false,
      issues: issues.map((i) => {
        const parts = i.path
          .split("/")
          .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
        return {
          ...i,
          groupId: parts[1] === "groups" ? parts[2] : i.groupId,
          environmentId: parts.includes("environments")
            ? parts[parts.indexOf("environments") + 1]
            : undefined,
          featureId: parts.includes("features")
            ? parts[parts.indexOf("features") + 1]
            : undefined,
        };
      }),
    };
  }
  return {
    success: true,
    files: [
      { filePath: "manifest.json", content: JSON.stringify(manifest, null, 2) },
      ...entries.map(([id, g]) => ({
        filePath: `${id}.json`,
        content: JSON.stringify(g, null, 2),
      })),
    ],
  };
}
