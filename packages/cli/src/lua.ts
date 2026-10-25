import Case from "case";
import type { PublishedGroup } from "@vexilla/types";

const reserved = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);
export function luaString(value: string): string {
  return (
    '"' +
    value.replace(/[\x00-\x1f\x7f"\\]/g, (char) =>
      char === '"'
        ? '\\"'
        : char === "\\"
        ? "\\\\"
        : "\\" + char.charCodeAt(0).toString().padStart(3, "0")
    ) +
    '"'
  );
}
function identifier(value: string, used: Set<string>): string {
  let name = Case.pascal(value).replace(
    /[^A-Za-z0-9_]/g,
    (char) => "_u" + char.charCodeAt(0).toString(16)
  );
  if (!name || /^[0-9]/.test(name) || reserved.has(name)) {
    name = "_" + name;
  }
  const base = name;
  let index = 2;
  while (used.has(name)) {
    name = base + "_" + index++;
  }
  used.add(name);
  return name;
}
export function luaGroups(
  groups: PublishedGroup[],
  prefix: string,
  suffix: string
) {
  const names = new Set<string>();
  return groups.map((group) => {
    const environments = new Set<string>();
    const features = new Set<string>();
    return {
      name: identifier(`${prefix} ${group.name} ${suffix} Group`, names),
      rawName: luaString(group.name),
      id: luaString(group.groupId),
      environments: Object.values(group.environments).map((environment) => ({
        name: identifier(environment.name, environments),
        id: luaString(environment.environmentId),
      })),
      features: Object.values(group.features).map((feature) => ({
        name: identifier(feature.name, features),
        id: luaString(feature.featureId),
      })),
    };
  });
}
