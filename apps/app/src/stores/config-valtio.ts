import { proxy, subscribe } from "valtio";
import { derive } from "valtio/utils";
import { z } from "zod";
import microdiff from "microdiff";
import { HostingConfigValidators } from "../utils/validators";
import { cloneDeep } from "lodash-es";
import { AppState, HostingConfig } from "../types";
import { gitLocationKey, gitReadContextKey, hasValue } from "../utils/fetcher";

const CONFIG_KEY = "config";
const REMOTE_CONFIG_KEY = "remoteConfig";
const REMOTE_METADATA_KEY = "remoteMetadata";

export const createDefaultConfig = (): AppState => ({
  modifiedAt: 0,
  groups: [],
  hosting: {
    provider: "",
    providerType: "",
  },
});

export const defaultConfig = createDefaultConfig();

export const configReadRefresh = proxy({ revision: 0 });
export function requestRemoteRead() {
  if (
    isRemoteReadContextCurrent() &&
    remoteMetadata.status === "initializing"
  ) {
    return;
  }
  advanceRemoteRead();
  remoteMetadata.status = "loading";
  remoteMetadata.readError = "";
  configReadRefresh.revision++;
}

export const config = proxy<AppState>(
  JSON.parse(localStorage.getItem(CONFIG_KEY) || "false") ||
    createDefaultConfig()
);

// Request authority is deliberately transient: its context includes credentials.
export const remoteReadAuthority = proxy({
  context: gitReadContextKey(config.hosting),
  generation: 0,
  initializationError: "",
});

export function captureRemoteRead() {
  return {
    context: gitReadContextKey(config.hosting),
    generation: remoteReadAuthority.generation,
  };
}

export function isRemoteReadContextCurrent() {
  return remoteReadAuthority.context === gitReadContextKey(config.hosting);
}

export function isRemoteReadCurrent(
  ticket: ReturnType<typeof captureRemoteRead>
) {
  return (
    isRemoteReadContextCurrent() &&
    ticket.context === remoteReadAuthority.context &&
    ticket.generation === remoteReadAuthority.generation
  );
}

export function advanceRemoteRead() {
  remoteReadAuthority.context = gitReadContextKey(config.hosting);
  remoteReadAuthority.generation++;
  return captureRemoteRead();
}

subscribe(config, (changes) => {
  const changingModifiedAt = changes.find(
    (change) => change[1][0] === "modifiedAt"
  );
  if (!changingModifiedAt) {
    config.modifiedAt = Date.now();
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
});

export const remoteConfig = proxy<AppState>(
  JSON.parse(localStorage.getItem(REMOTE_CONFIG_KEY) || "false") ||
    createDefaultConfig()
);

subscribe(remoteConfig, () => {
  localStorage.setItem(REMOTE_CONFIG_KEY, JSON.stringify(remoteConfig));
});

export type RemoteReadStatus =
  | "unknown"
  | "loading"
  | "initialization-required"
  | "initializing"
  | "ready"
  | "absent"
  | "error";
interface RemoteMetadata {
  remoteModifiedAt: number;
  remoteMergedAt: number;
  locationKey: string;
  status: RemoteReadStatus;
  readError: string;
}

export const remoteMetadata = proxy<RemoteMetadata>({
  remoteModifiedAt: 0,
  remoteMergedAt: 0,
  locationKey: "",
  // A persisted timestamp alone cannot prove that a baseline belongs here.
  ...JSON.parse(localStorage.getItem(REMOTE_METADATA_KEY) || "{}"),
  status: "unknown",
  readError: "",
});
subscribe(remoteMetadata, () => {
  localStorage.setItem(REMOTE_METADATA_KEY, JSON.stringify(remoteMetadata));
});

// Invalidate synchronously, before React effects or a late response can run.
subscribe(
  config,
  () => {
    if (!isRemoteReadContextCurrent()) {
      advanceRemoteRead();
      remoteReadAuthority.initializationError = "";
      remoteMetadata.status = "unknown";
      remoteMetadata.readError = "";
    }
  },
  true
);

function baselineMatches(hosting: HostingConfig, metadata: RemoteMetadata) {
  return (
    hosting.providerType === "git" &&
    hasValue(hosting.repositoryId) &&
    hasValue(hosting.targetBranch) &&
    metadata.locationKey === gitLocationKey(hosting) &&
    (metadata.status === "ready" || metadata.status === "absent")
  );
}

export function isRemoteBaselineReady() {
  return baselineMatches(config.hosting, remoteMetadata);
}

export const remoteReadState = derive({
  ready: (get) => baselineMatches(get(config).hosting, get(remoteMetadata)),
});

// A new location must never borrow either its diffs or readiness from the old one.
export function invalidateRemoteMetadata(
  locationKey = gitLocationKey(config.hosting)
) {
  Object.assign(remoteConfig, createDefaultConfig());
  Object.assign(remoteMetadata, {
    remoteModifiedAt: 0,
    remoteMergedAt: 0,
    locationKey,
    status: "unknown",
    readError: "",
  });
}

export function beginRemoteRead() {
  const locationKey = gitLocationKey(config.hosting);
  if (remoteMetadata.locationKey !== locationKey) {
    invalidateRemoteMetadata(locationKey);
  }
  // Keep a known baseline stable during routine background refreshes. A new
  // location, retry, or explicit refresh must first establish its baseline.
  if (!isRemoteBaselineReady()) {
    remoteMetadata.status = "loading";
  }
  remoteMetadata.readError = "";
}

export function failRemoteRead(message: string) {
  remoteMetadata.status = "error";
  remoteMetadata.readError = message;
}

// Never attach caller-owned mutable objects to the remote baseline.
export function acceptRemoteConfig(result: AppState | null) {
  if (
    result !== null &&
    (!result ||
      !Array.isArray(result.groups) ||
      !result.hosting ||
      typeof result.hosting !== "object" ||
      !Number.isFinite(result.modifiedAt))
  ) {
    throw new Error("Invalid remote configuration");
  }
  const baseline =
    result === null
      ? { modifiedAt: 0, groups: [], hosting: cloneDeep(config.hosting) }
      : cloneDeep(result);
  // An absent file is an empty baseline, never a copy of unpublished drafts.
  if (result === null && baseline.hosting.providerType === "git") {
    baseline.hosting.accessToken = "";
  }
  if (JSON.stringify(remoteConfig) !== JSON.stringify(baseline)) {
    remoteMetadata.remoteMergedAt = 0;
  }
  remoteConfig.groups = baseline.groups;
  remoteConfig.hosting = baseline.hosting;
  remoteConfig.modifiedAt = baseline.modifiedAt;
  remoteMetadata.remoteModifiedAt = baseline.modifiedAt;
  remoteMetadata.locationKey = gitLocationKey(config.hosting);
  remoteMetadata.status = result === null ? "absent" : "ready";
  remoteMetadata.readError = "";
}

export const validation = derive({
  result: (get) => {
    const currentConfig = get(config);
    const provider = currentConfig.hosting.provider;

    if (provider !== "") {
      const validator = HostingConfigValidators[provider];
      const result = validator.safeParse({ ...currentConfig.hosting });
      return result;
    } else {
      return {
        success: false,
        error: new z.ZodError([
          {
            code: z.ZodIssueCode.custom,
            path: ["provider"],
            message: "Empty provider is invalid",
          },
        ]),
      };
    }
  },
});

export const remoteDifferences = derive({
  result: (get) => {
    const currentConfig = get(config);
    const metadata = get(remoteMetadata);
    if (
      !baselineMatches(currentConfig.hosting, metadata) ||
      metadata.status === "absent"
    ) {
      return [];
    }
    return microdiff(currentConfig, get(remoteConfig)).filter(
      (diff) => diff.path.join(".") !== "hosting.accessToken"
    );
  },
});

export const localDifferences = derive({
  result: (get) => {
    const currentConfig = get(config);
    if (!baselineMatches(currentConfig.hosting, get(remoteMetadata))) {
      return [];
    }
    return microdiff(get(remoteConfig), currentConfig).filter(
      (diff) => diff.path.join(".") !== "hosting.accessToken"
    );
  },
});
