import _React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button, TextInput, Flex, Box } from "@mantine/core";

import {
  DefaultFeatureValues,
  VexillaEnvironment,
  VexillaFeature,
  VexillaGradualFeature,
  VexillaSchedule,
  VexillaSelectiveFeature,
  VexillaToggleFeature,
  VexillaValueFeature,
} from "@vexilla/types";
import { useSnapshot } from "valtio";

import { config } from "../../stores/config-valtio";
import { nanoid } from "../../utils/nanoid";

import { PageLayout } from "../../components/PageLayout";
import { CustomList, CustomListItem } from "../../components/CustomList";

import { Icon } from "@iconify/react";
import rewindBackBroken from "@iconify/icons-solar/rewind-back-broken";
import { cloneDeep } from "lodash-es";

const DEFAULT_SCHEDULE: VexillaSchedule = {
  start: 0,
  end: 0,
  timezone: "UTC",
  timeType: "none",
  startTime: 0,
  endTime: 0,
};

const DefaultEnvironmentDefaults: DefaultFeatureValues = {
  toggle: {
    name: "",
    featureId: "null",
    featureType: "toggle",
    value: false,
    scheduleType: "",
    schedule: DEFAULT_SCHEDULE,
  },
  gradual: {
    name: "",
    featureId: "null",
    featureType: "gradual",
    seed: 0,
    value: 0,
    scheduleType: "",
    schedule: DEFAULT_SCHEDULE,
  } as VexillaGradualFeature,
  selective: {
    name: "",
    featureId: "null",
    featureType: "selective",
    valueType: "string",
    value: [],
    scheduleType: "",
    schedule: DEFAULT_SCHEDULE,
  } as VexillaSelectiveFeature,
  value: {
    name: "",
    featureId: "null",
    featureType: "value",
    valueType: "string",
    value: "",
    scheduleType: "",
    schedule: DEFAULT_SCHEDULE,
  } as VexillaValueFeature,
} as const;

export function EditGroup() {
  const params = useParams();
  useSnapshot(config);

  const navigate = useNavigate();

  const groups = config.groups;
  const group = groups.find((_group) => _group.groupId === params.groupId);
  const environments = group?.environments || {};
  const features = group?.features || {};

  const [groupName, setGroupName] = useState(group?.name);

  useEffect(() => {
    setGroupName(group?.name);
  }, [group?.name]);

  // Coerce arrays into records temporarily
  useEffect(() => {
    if (group?.environments.length !== undefined) {
      group.environments = Object.values(group.environments).reduce(
        (newEnvironments, environment) => {
          newEnvironments[environment.environmentId] = environment;

          return newEnvironments;
        },
        {} as Record<string, VexillaEnvironment>
      );
    }

    if (group?.features.length !== undefined) {
      group.features = Object.values(group.features).reduce(
        (newFeatures, feature) => {
          newFeatures[feature.featureId] = feature;
          return newFeatures;
        },
        {} as Record<string, VexillaFeature>
      );
    }
  }, []);

  console.log({ features });

  // const form = useForm({
  //   initialValues: {
  //     [FormFields.name]: group?.name || "",
  //   },
  //   validate: {
  //     [FormFields.name]: (value) =>
  //       (!!value ? null : "Invalid Name") ||
  //       groups.filter(
  //         (_group) =>
  //           _group.name.toLocaleLowerCase() === value.toLocaleLowerCase()
  //       ).length < 1
  //         ? null
  //         : "Duplicate Name",
  //   },
  //   validateInputOnChange: true,
  // });

  return (
    <PageLayout>
      <Box>
        <Button
          variant="light"
          onClick={() => {
            navigate(`/`);
          }}
          leftIcon={<Icon icon={rewindBackBroken} />}
          fullWidth={false}
        >
          Back to Home
        </Button>
      </Box>
      {!group && (
        <>
          <h2>Group not found</h2>
          <p>Would you like to create a new one?</p>
          <Button>Add New Group</Button>
        </>
      )}
      {!!group && (
        <>
          <h2>Edit Group</h2>
          <TextInput
            className="mb-8"
            label={"Name"}
            value={groupName}
            onChange={(event) => {
              group.name = event.currentTarget.value;
              setGroupName(event.currentTarget.value);
            }}
          />
          <Flex direction="row" gap={"1rem"}>
            <Box w="50%">
              <CustomList<VexillaEnvironment>
                title="Environments"
                itemType="Environment"
                items={Object.values(environments)}
                getKey={(environment) => environment.name}
                showCount
                onAdd={() => {
                  const features: Record<string, VexillaFeature> = {};
                  Object.values(group.features).forEach((feature) => {
                    features[feature.featureId] = cloneDeep(
                      DefaultEnvironmentDefaults[feature.featureType]
                    );
                  });
                  const environmentsArray = Object.values(environments);
                  const environmentId = nanoid();
                  group.environments[environmentId] = {
                    name: `Environment ${environmentsArray.length + 1}`,
                    environmentId,
                    defaultEnvironmentFeatureValues: cloneDeep(
                      DefaultEnvironmentDefaults
                    ),
                    features,
                  };
                }}
                listItem={(environment) => (
                  <CustomListItem
                    name={environment.name}
                    itemType="Environment"
                    linkPath={`/groups/${group.groupId}/environments/${environment.environmentId}`}
                    onDelete={() => {
                      delete group.environments[environment.environmentId];
                    }}
                  />
                )}
                tooltipText={
                  "Environments are your deploy targets. These are the places where your flags may differ from each other based on Environment. (dev, staging, prod, etc)"
                }
              />
            </Box>

            <Box w="50%">
              <CustomList<VexillaFeature>
                title="Features"
                itemType="Feature"
                items={Object.values(features)}
                getKey={(feature) => feature?.featureId}
                showCount
                onAdd={() => {
                  const featureId = nanoid();
                  const featureName = `Feature ${
                    Object.values(features).length + 1
                  }`;
                  group.features[featureId] = {
                    ...(cloneDeep(
                      DefaultEnvironmentDefaults.toggle
                    ) as VexillaToggleFeature),
                    name: featureName,
                    featureId,
                  };
                  // handle environment defaults
                  Object.values(group.environments).forEach((environment) => {
                    environment.features[featureId] = {
                      ...cloneDeep(DefaultEnvironmentDefaults.toggle),
                      ...environment.defaultEnvironmentFeatureValues["toggle"],
                      name: featureName,
                      featureId,
                    };
                  });
                }}
                listItem={(feature) => (
                  <CustomListItem
                    name={`${feature.name}`}
                    itemType="Feature"
                    linkPath={`/groups/${group.groupId}/features/${feature.featureId}`}
                    onDelete={() => {
                      delete group.features[feature.featureId];
                    }}
                  />
                )}
                tooltipText={
                  "Environments are your deploy targets. These are the places where your flags may differ from each other based on Environment. (dev, staging, prod, etc)"
                }
              />
            </Box>
          </Flex>
        </>
      )}
    </PageLayout>
  );
}
