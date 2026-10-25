import { subscribe } from "valtio";
import {
  config,
  remoteMetadata,
  remoteReadAuthority,
  acceptRemoteConfig,
  beginRemoteRead,
  failRemoteRead,
  invalidateRemoteMetadata,
  advanceRemoteRead,
  isRemoteReadCurrent,
  isRemoteReadContextCurrent,
  requestRemoteRead,
} from "../stores/config-valtio";
import {
  Fetcher,
  GitFetcher,
  isGitUnauthorized,
  gitErrorMessage,
  gitLocationKey,
} from "./fetcher";

// A write remains pending at its captured destination even if selection changes.
const pendingInitializations = new Set<string>();

// One lifecycle owns preparation and polling for the active selection.
export function startConfigPolling(fetcher: Fetcher) {
  if (
    fetcher.isConfigReady(config.hosting) &&
    pendingInitializations.has(gitLocationKey(config.hosting))
  ) {
    beginRemoteRead();
    remoteMetadata.status = "initializing";
    return;
  }
  if (
    !fetcher.isConfigReady(config.hosting) ||
    (isRemoteReadContextCurrent() && remoteMetadata.status === "initializing")
  ) {
    return;
  }
  const ticket = advanceRemoteRead();
  let active = true;
  let inFlight = false;
  let prepared = !fetcher.usesReadPreparation;
  let interval: ReturnType<typeof setInterval> | undefined;
  const isCurrent = () => active && isRemoteReadCurrent(ticket);
  const isPaused = () =>
    remoteMetadata.status === "initialization-required" ||
    remoteMetadata.status === "initializing";
  const stopInterval = () => {
    clearInterval(interval);
    interval = undefined;
  };
  const requiresInitialization = async () => {
    const result = await fetcher.prepareRead();
    if (!isCurrent()) {
      return true;
    }
    if (result === "initialization-required") {
      invalidateRemoteMetadata();
      remoteMetadata.status = result;
      remoteMetadata.readError = "";
      if (config.hosting.providerType === "git") {
        config.hosting.branchIsValid = false;
      }
      stopInterval();
      return true;
    }
    prepared = true;
    return false;
  };
  async function refresh() {
    if (!isCurrent() || inFlight || isPaused()) {
      return;
    }
    inFlight = true;
    beginRemoteRead();
    try {
      if (!prepared && (await requiresInitialization())) {
        return;
      }
      const result = await fetcher.getCurrentConfig();
      if (isCurrent()) {
        acceptRemoteConfig(result);
        if (
          fetcher instanceof GitFetcher &&
          fetcher.usesReadPreparation &&
          config.hosting.providerType === "git"
        ) {
          config.hosting.branchIsValid = true;
        }
      }
    } catch (error) {
      // A previously existing branch may have disappeared. Recheck availability
      // before reporting the failed config read as an ordinary provider error.
      if (
        isCurrent() &&
        prepared &&
        fetcher.shouldPrepareAfterReadError(error)
      ) {
        prepared = false;
        remoteMetadata.status = "loading";
        try {
          if (await requiresInitialization()) {
            return;
          }
        } catch (preparationError) {
          error = preparationError;
        }
      }
      if (isCurrent()) {
        failRemoteRead(gitErrorMessage(error));
        if (isGitUnauthorized(error) && config.hosting.providerType === "git") {
          config.hosting.accessToken = "";
        }
      }
    } finally {
      inFlight = false;
      if (isCurrent() && !isPaused() && !interval) {
        interval = setInterval(() => void refresh(), 30000);
      }
    }
  }
  // Starting/restarting a lifecycle must establish a fresh matching baseline.
  remoteMetadata.status = "loading";
  const unsubscribe = subscribe(
    remoteReadAuthority,
    () => {
      if (!isCurrent()) {
        active = false;
        stopInterval();
      }
    },
    true
  );
  if (!fetcher.usesReadPreparation) {
    interval = setInterval(() => void refresh(), 30000);
  }
  void refresh();
  return () => {
    active = false;
    stopInterval();
    unsubscribe();
  };
}

// Every attempt is followed by rediscovery, including an unacknowledged write.
// The form and poller may use different fetcher instances; shared state owns the
// pending operation and prevents a duplicate write.
export async function initializeGitBranch(fetcher: GitFetcher, branch: string) {
  const destination = gitLocationKey(config.hosting);
  if (
    pendingInitializations.has(destination) ||
    !isRemoteReadContextCurrent() ||
    remoteMetadata.status !== "initialization-required" ||
    config.hosting.providerType !== "git" ||
    branch !== config.hosting.targetBranch
  ) {
    return;
  }
  pendingInitializations.add(destination);
  const ticket = advanceRemoteRead();
  remoteMetadata.status = "initializing";
  remoteMetadata.readError = "";
  remoteReadAuthority.initializationError = "";
  config.hosting.branchIsValid = false;
  try {
    await fetcher.initializeBranch(branch);
  } catch (error) {
    if (isRemoteReadCurrent(ticket)) {
      remoteReadAuthority.initializationError =
        "Initialization was not confirmed. Review repository availability before trying again.";
      if (isGitUnauthorized(error)) {
        failRemoteRead(gitErrorMessage(error));
        config.hosting.accessToken = "";
      }
    }
    throw error;
  } finally {
    pendingInitializations.delete(destination);
    const resumedDestination =
      isRemoteReadContextCurrent() &&
      gitLocationKey(config.hosting) === destination &&
      remoteMetadata.status === "initializing";
    if (isRemoteReadCurrent(ticket) || resumedDestination) {
      remoteMetadata.status = "loading";
      requestRemoteRead();
    }
  }
}
