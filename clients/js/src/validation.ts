import {
  validateManifest,
  validatePublication,
  PublishedGroup,
  VexillaManifest,
} from "@vexilla/types";
import { VexillaError } from "./errors";

function reject(issues: unknown[]) {
  if (issues.length) {
    throw new VexillaError(
      "validation",
      "Invalid v1 data: " + JSON.stringify(issues)
    );
  }
}
export function validateManifestData(
  value: unknown
): asserts value is VexillaManifest {
  reject(validateManifest(value));
  const manifest = value as VexillaManifest;
  // Cross-document checks run when a real group is available. Empty groups let
  // the publisher check identities/aliases without fetching actual groups.
  const identities: Record<string, unknown> = Object.create(null);
  for (const entry of manifest.groups) {
    identities[entry.groupId] = {
      groupId: entry.groupId,
      name: entry.name,
      meta: { version: "v1" },
      features: {},
      environments: {},
    };
  }
  reject(validatePublication(manifest, identities).issues);
}
export function validateGroupData(
  value: unknown,
  manifest: VexillaManifest
): asserts value is PublishedGroup {
  const id = (value as PublishedGroup)?.groupId;
  const entry = manifest.groups.find((group) => group.groupId === id);
  if (!entry) {
    throw new VexillaError("validation", "Group is not listed in the manifest");
  }
  reject(
    validatePublication({ ...manifest, groups: [entry] }, { [id]: value })
      .issues
  );
}
