import { atomWithStorage } from "./utils/storage";
import { AppState, Group } from "@vexilla/types";
import { SetStateAction, WritableAtom, atom } from "jotai";
import { focusAtom } from "jotai-optics";

const configKey = "config";

export const configStore = atomWithStorage<AppState>(configKey, {
  groups: [],
  hosting: undefined,
  defaultEnvironmentFeatureValues: {},
  existingFeatures: {},
});

export const groupsStore = atom(
  (get) => get(configStore).groups,
  (get, set, groups: Group[]) => {
    const config = get(configStore);
    set(configStore, {
      ...config,
      groups,
    });
  }
);
