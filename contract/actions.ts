import { changeFeatureType } from "../packages/publishing/src";
import type { Group } from "@vexilla/types";
/** Explicit corpus editing actions follow the same constructors as the UI. */
export function applyContractActions(
  config: { groups: Group[] },
  actions: { groupId: string; featureId: string; featureType: "gradual" }[]
) {
  for (const action of actions) {
    const group = config.groups.find((g) => g.groupId === action.groupId);
    if (!group) {
      throw Error("Unknown contract action group");
    }
    changeFeatureType(group, action.featureId, {
      featureType: action.featureType,
    });
  }
  return config;
}
