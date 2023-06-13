import { AppState } from "@vexilla/types";
import { proxy, subscribe } from "valtio";

const CONFIG_KEY = "config";

export const config = proxy<AppState>(
  JSON.parse(localStorage.getItem(CONFIG_KEY) || "false") || {
    groups: [],
    hosting: {
      provider: "",
      config: {
        provider: "",
        providerType: "",
      },
    },
    existingFeatures: {},
  }
);

subscribe(config, () => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
});
