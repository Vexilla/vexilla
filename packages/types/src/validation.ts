import { normalizeName, isCompatibleTimezone } from "./compatibility";
import Ajv, { ErrorObject, ValidateFunction } from "ajv";
import manifestSchema from "../schema/v1/manifest.json";
import groupSchema from "../schema/v1/group.json";
import featureSchema from "../schema/v1/feature.json";
import scheduleSchema from "../schema/v1/schedule.json";
import type { PublishedGroup, PublishedManifest } from "./published";

export interface ContractIssue {
  path: string;
  expected: string;
  repair: string;
  groupId?: string;
  featureId?: string;
  environmentId?: string;
}
export type ValidationResult =
  | { success: true; issues: [] }
  | { success: false; issues: ContractIssue[] };
const ajv = new Ajv({
  allErrors: true,
  strict: false,
  strictNumbers: true,
  discriminator: true,
  verbose: true,
});
ajv.addFormat("iana-time-zone", isCompatibleTimezone);
ajv.addSchema([scheduleSchema, featureSchema, groupSchema, manifestSchema]);
const checkManifest = ajv.getSchema(manifestSchema.$id)!;
const checkGroup = ajv.getSchema(groupSchema.$id)!;
const checkFeature = ajv.getSchema(featureSchema.$id)!;
export const pointer = (value: string) =>
  value.replace(/~/g, "~0").replace(/\//g, "~1");
export function issue(
  path: string,
  expected: string,
  context: Partial<ContractIssue> = {}
): ContractIssue {
  const field = path.split("/").at(-1) || "value";
  return {
    path,
    expected,
    repair: `Edit ${field}: enter ${expected}, then retry publishing.`,
    ...context,
  };
}
function schemaIssues(
  check: ValidateFunction,
  value: unknown,
  prefix: string
): ContractIssue[] {
  const unicode = unicodeIssues(value, prefix);
  if (unicode.length) {
    return unicode;
  }
  if (check(value)) {
    return [];
  }
  return (check.errors || []).map((error: ErrorObject) => {
    let path = prefix + error.instancePath;
    if (error.keyword === "required") {
      path += "/" + pointer(error.params.missingProperty);
    }
    if (error.keyword === "discriminator") {
      path += "/" + pointer(error.params.tag);
    }
    const property = (error.parentSchema as any)?.properties?.[
      error.params.missingProperty
    ];
    const expected =
      error.keyword === "required"
        ? property?.type
          ? `a required ${property.type}`
          : `a complete ${error.params.missingProperty}`
        : error.keyword === "const"
        ? JSON.stringify(error.params.allowedValue)
        : error.keyword === "enum"
        ? error.params.allowedValues.join(" or ")
        : error.keyword === "type"
        ? `a ${error.params.type}`
        : error.keyword === "discriminator"
        ? `a supported ${error.params.tag}`
        : error.message || "a valid value";
    return issue(path, expected);
  });
}
/** JSON strings and keys must contain Unicode scalar values, including extras. */
export function isWellFormedUnicode(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) {
        return false;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}
function unicodeIssues(value: unknown, path: string): ContractIssue[] {
  if (typeof value === "string") {
    return isWellFormedUnicode(value)
      ? []
      : [issue(path, "a Unicode string without unpaired surrogates")];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => [
      ...unicodeIssues(key, path + "/" + pointer(key)),
      ...unicodeIssues(item, path + "/" + pointer(key)),
    ]);
  }
  return [];
}
export const validateFeature = (value: unknown, path = "") =>
  schemaIssues(checkFeature, value, path);
export const validateGroup = (value: unknown, path = "") =>
  schemaIssues(checkGroup, value, path);
export const validateManifest = (value: unknown, path = "") =>
  schemaIssues(checkManifest, value, path);

function lookupIssues(
  items: { id: string; name: string; path: string }[]
): ContractIssue[] {
  const owners = new Map<string, string>();
  const issues: ContractIssue[] = [];
  for (const item of items) {
    for (const key of new Set([item.id, item.name, normalizeName(item.name)])) {
      if (owners.has(key) && owners.get(key) !== item.path) {
        issues.push(
          issue(
            item.path + "/name",
            "a unique name that does not shadow another ID"
          )
        );
      }
      owners.set(key, item.path);
    }
  }
  return issues;
}
/** Validate decoded bytes or pre-encoding objects. No coercion, defaults, or mutation. */
export function validatePublication(
  manifest: unknown,
  groups: Record<string, unknown>
): ValidationResult {
  const issues = validateManifest(manifest, "/manifest");
  for (const [id, group] of Object.entries(groups)) {
    issues.push(...validateGroup(group, "/groups/" + pointer(id)));
  }
  // Structural errors make semantic traversal unsafe; retain exact schema issue paths.
  if (!issues.length) {
    const m = manifest as PublishedManifest;
    const gs = groups as Record<string, PublishedGroup>;
    issues.push(
      ...lookupIssues(
        m.groups.map((g, i) => ({
          id: g.groupId,
          name: g.name,
          path: `/manifest/groups/${i}`,
        }))
      )
    );
    const ids = m.groups.map((g) => g.groupId);
    for (const [i, entry] of m.groups.entries()) {
      const group = gs[entry.groupId];
      if (!group) {
        issues.push(
          issue(`/manifest/groups/${i}/groupId`, "an existing group file")
        );
      } else if (entry.name !== group.name) {
        issues.push(issue(`/manifest/groups/${i}/name`, "the group file name"));
      }
    }
    for (const [key, group] of Object.entries(gs)) {
      const p = "/groups/" + pointer(key);
      if (
        ["manifest", "config", ".", ".."].includes(key) ||
        /[/\\\0]/.test(key)
      ) {
        issues.push(
          issue(
            p + "/groupId",
            "a safe group file name other than manifest or config"
          )
        );
      }
      if (group.groupId !== key) {
        issues.push(issue(p + "/groupId", `the map key ${key}`));
      }
      if (!ids.includes(key)) {
        issues.push(issue(p + "/groupId", "a group listed in the manifest"));
      }
      issues.push(
        ...lookupIssues(
          Object.entries(group.features).map(([id, f]) => ({
            id,
            name: f.name,
            path: `${p}/features/${pointer(id)}`,
          }))
        )
      );
      issues.push(
        ...lookupIssues(
          Object.entries(group.environments).map(([id, e]) => ({
            id,
            name: e.name,
            path: `${p}/environments/${pointer(id)}`,
          }))
        )
      );
      for (const [id, f] of Object.entries(group.features)) {
        if (id !== f.featureId) {
          issues.push(
            issue(`${p}/features/${pointer(id)}/featureId`, `the map key ${id}`)
          );
        }
      }
      for (const [id, env] of Object.entries(group.environments)) {
        const ep = `${p}/environments/${pointer(id)}`;
        if (id !== env.environmentId) {
          issues.push(issue(ep + "/environmentId", `the map key ${id}`));
        }
        for (const featureId of new Set([
          ...Object.keys(group.features),
          ...Object.keys(env.features),
        ])) {
          const fp = `${ep}/features/${pointer(featureId)}`;
          const f = env.features[featureId];
          const original = group.features[featureId];
          if (!f || !original) {
            issues.push(issue(fp, "the exact group feature set"));
            continue;
          }
          if (f.featureId !== featureId) {
            issues.push(issue(fp + "/featureId", `the map key ${featureId}`));
          }
          if (f.name !== original.name) {
            issues.push(issue(fp + "/name", "the group feature name"));
          }
          for (const field of [
            "featureType",
            "valueType",
            "numberType",
          ] as const) {
            if ((f as any)[field] !== (original as any)[field]) {
              issues.push(issue(fp + "/" + field, `the group ${field}`));
            }
          }
        }
      }
    }
  }
  const contextual = issues.map((i) => {
    const parts = i.path
      .split("/")
      .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
    const manifestEntry =
      parts[1] === "manifest" &&
      parts[2] === "groups" &&
      Array.isArray((manifest as any)?.groups)
        ? (manifest as any).groups[Number(parts[3])]
        : undefined;
    return {
      ...i,
      ...(parts[1] === "groups"
        ? { groupId: parts[2] }
        : typeof manifestEntry?.groupId === "string"
        ? { groupId: manifestEntry.groupId }
        : {}),
      ...(parts.includes("environments")
        ? { environmentId: parts[parts.indexOf("environments") + 1] }
        : {}),
      ...(parts.includes("features")
        ? { featureId: parts[parts.indexOf("features") + 1] }
        : {}),
    };
  });
  return contextual.length
    ? { success: false, issues: contextual }
    : { success: true, issues: [] };
}
