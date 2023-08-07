import { AppState } from "@vexilla/types";
import { proxy, subscribe } from "valtio";
import { derive } from "valtio/utils";
import { z } from "zod";
import microdiff from "microdiff";
import { HostingConfigValidators } from "../utils/validators";
import { omit } from "lodash-es";

const CONFIG_KEY = "config";

export const config = proxy<AppState>(
  JSON.parse(localStorage.getItem(CONFIG_KEY) || "false") || {
    modifiedAt: 0,
    groups: [],
    hosting: {
      provider: "",
      config: {
        provider: "",
        providerType: "",
      },
    },
  }
);

subscribe(config, (changes) => {
  let changingModifiedAt = changes.find(
    (change) => change[1][0] === "modifiedAt"
  );
  if (!changingModifiedAt) {
    config.modifiedAt = Date.now();
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
});

export const remoteConfig = proxy<AppState>({
  modifiedAt: 0,
  remoteModifiedAt: 0,
  remoteMergedAt: 0,
  groups: [],
  hosting: {
    provider: "",
    providerType: "",
  },
});

export const validation = derive({
  result: (get) => {
    const currentConfig = get(config);
    const provider = currentConfig.hosting.provider;

    if (provider !== "") {
      const validator = HostingConfigValidators[provider];
      const result = validator.safeParse(currentConfig.hosting);
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
    const currentRemoteConfig = get(remoteConfig);

    return microdiff(currentConfig, currentRemoteConfig).filter((diff) => {
      return diff.path.join(".") !== "hosting.accessToken";
    });
  },
});

export const localDifferences = derive({
  result: (get) => {
    const currentConfig = get(config);
    const currentRemoteConfig = get(remoteConfig);

    return microdiff(currentRemoteConfig, currentConfig).filter((diff) => {
      return diff.path.join(".") !== "hosting.accessToken";
    });
  },
});
