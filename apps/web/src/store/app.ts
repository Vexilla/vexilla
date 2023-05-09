import { HostingService } from "./../services/hosting.service";
import { ActionContext } from "vuex";
import {
  VexillaToggleFeature,
  VexillaGradualFeature,
  VexillaFeatureType,
  VexillaSelectiveFeature,
} from "@vexilla/client";
import {
  HostingAdapter,
  HostingProvider,
  HostingConfig,
  HostingStatus,
} from "@/services/hosting.service";

import { isEqual, differenceWith } from "lodash/fp";

export type VexillaFeatureTypeString = "gradual" | "toggle" | "selective";

export interface Environment {
  name: string;
}

export type VexillaFeature =
  | VexillaToggleFeature
  | VexillaGradualFeature
  | VexillaSelectiveFeature;

export interface Feature {
  name: string;
  type: VexillaFeatureTypeString;
  options: VexillaFeature;
}

export interface FeatureSettings {
  [key: string]: VexillaFeature;
}

// export interface DefaultFeatureValues {
//   [key: VexillaFeatureType]: VexillaFeature;
// }

export type DefaultFeatureValues = {
  [P in VexillaFeatureTypeString]: VexillaFeature;
};

export interface DefaultEnvironmentFeatureValues {
  [key: string]: DefaultFeatureValues;
}

export interface AppState {
  features: Feature[];
  featuresSettings: FeatureSettings;
  environments: Environment[];
  hosting: HostingAdapter;
  defaultEnvironmentFeatureValues: DefaultEnvironmentFeatureValues;
  existingFeatures: any;
}

export interface UpdatePayload<T> {
  previous: T;
  current: T;
}

export interface FeatureSettingPayload {
  feature: Feature;
  environment: Environment;
  type: VexillaFeatureTypeString;
  settings: VexillaFeature;
}

export interface DefaultValuesPayload {
  environment: Environment;
  defaultValues: DefaultFeatureValues;
}

export default {
  namespaced: true,
  state: {
    features: [],
    featuresSettings: {},
    environments: [],
    hosting: {
      provider: null,
      config: null,
      status: null,
    },
    defaultEnvironmentFeatureValues: {},
    existingFeatures: null,
  } as AppState,
  getters: {
    environmentByName: (state: AppState) => (name: string) =>
      state.environments.find((environment) => environment.name === name),
    featureByName: (state: AppState) => (name: string) =>
      state.features.find((feature) => feature.name === name),
    getFeatureSettings: (state: AppState) => (
      feature: Feature,
      environment: Environment,
      type: VexillaFeatureTypeString
    ) => {
      const featureSettingsKey = `${feature.name}/${environment.name}/${type}`;
      const settings = state.featuresSettings[featureSettingsKey];

      return settings;
    },
    configIsValid: (state: AppState) => () => {
      try {
        return HostingService.isConfigValid(state.hosting);
      } catch (e) {
        console.log("Error running isConfigValid", e);
        return false;
      }
    },

    dataHasChanged: (state: AppState) => () => {
      return !isEqual(
        state.existingFeatures,
        HostingService.formatPayloadFromState(state)
      );
    },
  },
  mutations: {
    addFeature(state: AppState, newFeature: Feature) {
      state.features.push({
        ...newFeature,
        type: "toggle",
      });

      state.environments.forEach((environment) => {
        state.featuresSettings[
          `${newFeature.name}/${environment.name}/toggle`
        ] = {
          value: (state.defaultEnvironmentFeatureValues[
            environment.name
          ] as any).toggle["value"],
        } as any;
      });
    },
    removeFeature(state: AppState, feature: Feature) {
      const featureIndex = state.features.indexOf(feature);
      state.features.splice(featureIndex, 1);
    },
    editFeature(state: AppState, payload: UpdatePayload<Feature>) {
      const { previous, current } = payload;

      // while navigating away from features, this was being called with an invalid type
      if (!current.type) {
        return;
      }

      const featureIndex = state.features.indexOf(previous);
      state.features[featureIndex] = {
        ...previous,
        ...current,
      };

      state.environments.forEach((environment) => {
        const currentFeatureSettings = {} as any;

        const previousFeatureSettings = state.featuresSettings[
          `${current.name}/${environment.name}/${current.type}`
        ] as any;

        if (
          !previousFeatureSettings ||
          (!previousFeatureSettings["value"] &&
            previousFeatureSettings["value"] !== 0)
        ) {
          currentFeatureSettings["value"] = (state
            .defaultEnvironmentFeatureValues[environment.name] as any)[
            current.type
          ]["value"];
        }

        if (
          !previousFeatureSettings ||
          (current.type === "gradual" &&
            !previousFeatureSettings["seed"] &&
            previousFeatureSettings["seed"] !== 0)
        ) {
          currentFeatureSettings["seed"] = (state
            .defaultEnvironmentFeatureValues[environment.name] as any)[
            current.type
          ]["seed"];
        }

        state.featuresSettings[
          `${current.name}/${environment.name}/${current.type}`
        ] = {
          ...previousFeatureSettings,
          ...currentFeatureSettings,
        };
      });
    },
    addEnvironment(state: AppState, newEnvironment: Environment) {
      state.environments.push(newEnvironment);
      state.defaultEnvironmentFeatureValues[newEnvironment.name] = {
        toggle: {
          type: VexillaFeatureType.TOGGLE,
          value: false,
        },
        gradual: {
          type: VexillaFeatureType.GRADUAL,
          seed: 0.01,
          value: 0,
        },
        selective: {
          type: VexillaFeatureType.SELECTIVE,
        },
      };
    },
    removeEnvironment(state: AppState, environment: Environment) {
      const environmentIndex = state.environments.indexOf(environment);
      state.environments.splice(environmentIndex, 1);
    },
    editEnvironment(state: AppState, payload: UpdatePayload<Environment>) {
      const { previous, current } = payload;
      const environmentIndex = state.environments.indexOf(previous);

      state.features.forEach((feature) => {
        // const previousEnvironmentSettings = ;
        state.featuresSettings[
          `${feature.name}/${current.name}/${feature.type}`
        ] =
          state.featuresSettings[
            `${feature.name}/${previous.name}/${feature.type}`
          ];
        delete state.featuresSettings[
          `${feature.name}/${previous.name}/${feature.type}`
        ];
      });

      state.environments[environmentIndex] = {
        ...previous,
        ...current,
      };
    },
    setFeatureSettings(state: AppState, payload: FeatureSettingPayload) {
      const { feature, environment, type, settings } = payload;
      const currentSettings =
        state.featuresSettings[`${feature.name}/${environment.name}/${type}`];
      state.featuresSettings[`${feature.name}/${environment.name}/${type}`] = {
        ...currentSettings,
        ...settings,
      };
    },
    updateHostingProvider(state: AppState, hostingProvider: HostingProvider) {
      state.hosting.provider = hostingProvider;
    },
    updateHostingConfig(state: AppState, hostingConfig: HostingConfig) {
      state.hosting.config = hostingConfig;
    },
    updateDefaultFeatureValues(
      state: AppState,
      defaultValuesPayload: DefaultValuesPayload
    ) {
      const { environment, defaultValues } = defaultValuesPayload;
      state.defaultEnvironmentFeatureValues[environment.name] = defaultValues;
    },
    setHostingStatus(state: AppState, status: HostingStatus) {
      state.hosting.status = status;
    },
    setExistingFeatures(state: AppState, existingFeatures: any) {
      state.existingFeatures = existingFeatures;
    },
    importHostingAdapter(state: AppState, hostingAdapter: HostingAdapter) {
      state.hosting = hostingAdapter;
    },
  },
  actions: {
    addFeature(context: any, feature: Feature) {
      context.commit("addFeature", feature);
    },
    removeFeature(context: any, feature: Feature) {
      context.commit("removeFeature", feature);
    },
    editFeature(context: any, payload: UpdatePayload<Feature>) {
      context.commit("editFeature", payload);
    },
    addEnvironment(context: any, environment: Environment) {
      context.commit("addEnvironment", environment);
    },
    removeEnvironment(context: any, environment: Environment) {
      context.commit("removeEnvironment", environment);
    },
    editEnvironment(context: any, payload: UpdatePayload<Environment>) {
      context.commit("editEnvironment", payload);
    },
    setFeatureSettings(context: any, payload: FeatureSettingPayload) {
      context.commit("setFeatureSettings", payload);
    },
    updateHostingProvider(context: any, hostingProvider: HostingProvider) {
      console.log({ hostingProvider });
      context.commit("updateHostingProvider", hostingProvider);
    },
    updateHostingConfig(context: any, hostingConfig: HostingConfig) {
      context.commit("updateHostingConfig", hostingConfig);
    },
    updateDefaultEnvironmentValues(
      context: any,
      defaultValuesPayload: DefaultValuesPayload
    ) {
      context.commit("updateDefaultFeatureValues", defaultValuesPayload);
    },
    setHostingStatus(context: any, status: HostingStatus) {
      console.log({ status });
      context.commit("setHostingStatus", status);
    },
    setExistingFeatures(context: any, existingFeatures: any) {
      context.commit("setExistingFeatures", existingFeatures);
    },
    importHostingAdapter(context: any, hostingAdapter: HostingAdapter) {
      context.commit("importHostingAdapter", hostingAdapter);
    },
  },
  // publishSettings(context: any, jsonPayload: any) {},
};
