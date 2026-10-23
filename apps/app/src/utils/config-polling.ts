import { subscribe } from "valtio";
import {
  config,
  acceptRemoteConfig,
  beginRemoteRead,
  failRemoteRead,
} from "../stores/config-valtio";
import { Fetcher, isGitUnauthorized, gitErrorMessage } from "./fetcher";

// One lifecycle per active context. Serial refreshes cannot overwrite a newer result.
export function startConfigPolling(fetcher: Fetcher) {
  if (!fetcher.isConfigReady(config.hosting)) {
    return;
  }
  const key = fetcher.getReadContextKey(config.hosting);
  let active = true;
  let inFlight = false;
  const isCurrent = () =>
    active && key === fetcher.getReadContextKey(config.hosting);
  async function refresh() {
    if (!isCurrent() || inFlight) {
      return;
    }
    inFlight = true;
    beginRemoteRead();
    try {
      const result = await fetcher.getCurrentConfig();
      if (isCurrent()) {
        acceptRemoteConfig(result);
      }
    } catch (error) {
      if (isCurrent()) {
        failRemoteRead(gitErrorMessage(error));
      }
      if (
        isCurrent() &&
        isGitUnauthorized(error) &&
        config.hosting.providerType === "git"
      ) {
        config.hosting.accessToken = "";
      }
    } finally {
      inFlight = false;
    }
  }
  const interval = setInterval(() => {
    void refresh();
  }, 30000);
  const unsubscribe = subscribe(
    config,
    () => {
      if (key !== fetcher.getReadContextKey(config.hosting)) {
        active = false;
        clearInterval(interval);
      }
    },
    true
  );
  void refresh();
  return () => {
    active = false;
    clearInterval(interval);
    unsubscribe();
  };
}
