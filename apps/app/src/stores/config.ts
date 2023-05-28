// import { atomWithStorage } from "./utils/storage";
import { AppState, Group } from "@vexilla/types";
import { SetStateAction, WritableAtom, atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
// import { focusAtom } from "jotai-optics";

const configKey = "config";

export const configStore = atomWithStorage<AppState>(configKey, {
  groups: [],
  hosting: undefined,
  existingFeatures: {},
});

export const groupsStore = atom(
  (get) => {
    const groups = get(configStore).groups;
    console.log("groups in getter", groups);
    return groups;
  },
  (get, set, groups: Group[]) => {
    const config = get(configStore);
    console.log("setting config", config, groups);
    set(configStore, {
      ...config,
      groups,
    });
  }
);
