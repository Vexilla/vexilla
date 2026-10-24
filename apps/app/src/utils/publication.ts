import { cloneDeep, set, unset } from "lodash-es";
import type { Difference } from "microdiff";
import {
  serializePublication,
  PublicationFile,
  PublicationResult,
} from "@vexilla/publishing";
import type { AppState } from "../types";
import { gitLocationKey, gitReadContextKey } from "./fetcher";

export class PublicationDestinationError extends Error {
  constructor() {
    super(
      "Select and load the desired repository and branch before publishing there."
    );
  }
}

/** Apply review decisions to a copy so a rejected publication cannot edit saved drafts. */
export function approvedConfig(
  config: AppState,
  changes: Difference[],
  approvals: Record<string, boolean>
): AppState {
  const copy = cloneDeep(config);
  for (const change of [...changes].reverse()) {
    if (approvals[change.path.join(".")]) {
      continue;
    }
    if (change.type === "CREATE") {
      const parent = change.path
        .slice(0, -1)
        .reduce((value: any, key) => value?.[key], copy);
      const key = change.path.at(-1)!;
      if (Array.isArray(parent)) {
        parent.splice(Number(key), 1);
      } else {
        unset(copy, change.path);
      }
    } else {
      set(copy, change.path, cloneDeep(change.oldValue));
    }
  }
  return copy;
}
export async function publishApprovedChanges(
  config: AppState,
  changes: Difference[],
  approvals: Record<string, boolean>,
  write: (files: PublicationFile[], targetBranch?: string) => Promise<void>
): Promise<PublicationResult> {
  const approved = approvedConfig(config, changes, approvals);
  const destination = (state: AppState) =>
    JSON.stringify([
      gitLocationKey(state.hosting),
      gitReadContextKey(
        state.hosting.providerType === "git"
          ? { ...state.hosting, accessToken: "" }
          : state.hosting
      ),
    ]);
  // Review choices may change backup content, but cannot authorize another
  // transport destination whose remote baseline has not been read.
  if (destination(approved) !== destination(config)) {
    throw new PublicationDestinationError();
  }
  const result = serializePublication(approved);
  if (!result.success) {
    return result;
  }
  const hosting = approved.hosting as unknown as Record<string, unknown>;
  for (const key of [
    "accessToken",
    "accessKey",
    "accessKeyId",
    "secretAccessKey",
    "sharedAccessSignature",
    "apiKey",
  ]) {
    if (key in hosting) {
      hosting[key] = "";
    }
  }
  const files = [
    ...result.files,
    { filePath: "config.json", content: JSON.stringify(approved, null, 2) },
  ];
  await write(
    files,
    approved.hosting.providerType === "git"
      ? approved.hosting.targetBranch
      : undefined
  );
  return { success: true, files };
}
