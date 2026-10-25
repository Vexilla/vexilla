import type {
  DefaultFeatureValues,
  Group,
  VexillaEnvironment,
  VexillaFeature,
  VexillaSchedule,
} from "./types";
import type {
  VexillaFeatureTypeString,
  VexillaInputType,
  VexillaNumberType,
} from "@vexilla/types";
export const defaultSchedule = (): VexillaSchedule => ({
  start: 0,
  end: 0,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
});
export interface FeatureShape {
  featureType: VexillaFeatureTypeString;
  valueType?: VexillaInputType;
  numberType?: VexillaNumberType;
}
export function createFeature(
  identity: {
    featureId: string;
    name: string;
    scheduleType?: VexillaFeature["scheduleType"];
    schedule?: VexillaSchedule;
  },
  shape: FeatureShape = { featureType: "toggle" },
  defaults?: VexillaFeature
): VexillaFeature {
  const base = {
    featureId: identity.featureId,
    name: identity.name,
    featureType: shape.featureType,
    scheduleType: identity.scheduleType ?? "",
    schedule: { ...(identity.schedule || defaultSchedule()) },
  };
  const matching =
    defaults &&
    defaults.featureType === shape.featureType &&
    (defaults as any).valueType === shape.valueType &&
    (defaults as any).numberType === shape.numberType;
  const value = matching
    ? Array.isArray(defaults.value)
      ? [...defaults.value]
      : defaults.value
    : undefined;
  switch (shape.featureType) {
    case "toggle":
      return {
        ...base,
        featureType: "toggle",
        value: typeof value === "boolean" ? value : false,
      };
    case "gradual":
      return {
        ...base,
        featureType: "gradual",
        value: typeof value === "number" ? value : 0,
        seed: defaults?.featureType === "gradual" ? defaults.seed ?? 0.5 : 0.5,
      };
    case "selective":
      return shape.valueType === "number"
        ? {
            ...base,
            featureType: "selective",
            valueType: "number",
            numberType: shape.numberType || "int",
            value: Array.isArray(value) ? ([...value] as number[]) : [],
          }
        : {
            ...base,
            featureType: "selective",
            valueType: "string",
            value: Array.isArray(value) ? ([...value] as string[]) : [],
          };
    case "value":
      return shape.valueType === "number"
        ? {
            ...base,
            featureType: "value",
            valueType: "number",
            numberType: shape.numberType || "int",
            value: typeof value === "number" ? value : 0,
          }
        : {
            ...base,
            featureType: "value",
            valueType: "string",
            value: typeof value === "string" ? value : "",
          };
  }
}
export function defaultFeatureValues(): DefaultFeatureValues {
  const identity = { featureId: "default", name: "" };
  return Object.fromEntries(
    ["toggle", "gradual", "selective", "value"].map((featureType) => [
      featureType,
      createFeature(identity, {
        featureType: featureType as VexillaFeatureTypeString,
      }),
    ])
  ) as DefaultFeatureValues;
}
export function changeFeatureType(
  group: Group,
  id: string,
  shape: FeatureShape
): void {
  const previous = group.features[id];
  group.features[id] = createFeature(previous, shape);
  for (const env of Object.values(group.environments)) {
    env.features[id] = createFeature(
      {
        ...previous,
        scheduleType: env.features[id]?.scheduleType ?? previous.scheduleType,
        schedule: env.features[id]?.schedule || previous.schedule,
      },
      shape,
      env.defaultEnvironmentFeatureValues?.[shape.featureType]
    );
  }
}
export function addFeature(group: Group, id: string, name: string): void {
  group.features[id] = createFeature({ featureId: id, name });
  for (const env of Object.values(group.environments)) {
    env.features[id] = createFeature(
      group.features[id],
      { featureType: "toggle" },
      env.defaultEnvironmentFeatureValues?.toggle
    );
  }
}
export function createEnvironment(
  group: Group,
  environmentId: string,
  name: string
): VexillaEnvironment {
  const defaults = defaultFeatureValues();
  return {
    environmentId,
    name,
    defaultEnvironmentFeatureValues: defaults,
    features: Object.fromEntries(
      Object.entries(group.features).map(([id, f]) => [
        id,
        createFeature(f, f, defaults[f.featureType]),
      ])
    ),
  };
}
