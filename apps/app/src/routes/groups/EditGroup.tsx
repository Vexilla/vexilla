import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button, TextInput, Flex, Box } from "@mantine/core";

import {
  DefaultFeatureValues,
  Environment,
  Feature,
  Group as FeatureGroup,
  VexillaGradualFeature,
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

const DefaultEnvironmentDefaults: DefaultFeatureValues = {
  toggle: {
    featureId: nanoid(),
    type: "toggle",
    value: false,
    scheduleType: "",
  } as VexillaToggleFeature,
  gradual: {
    featureId: nanoid(),
    type: "gradual",
    seed: 0,
    value: 0,
    scheduleType: "",
  } as VexillaGradualFeature,
  selective: {
    featureId: nanoid(),
    type: "selective",
    valueType: "string",
    value: [],
    scheduleType: "",
  } as VexillaSelectiveFeature,
  value: {
    featureId: nanoid(),
    type: "value",
    valueType: "string",
    value: "",
    scheduleType: "",
  } as VexillaValueFeature,
} as const;

export function EditGroup() {
  const params = useParams();
  useSnapshot(config);

  const navigate = useNavigate();

  const groups = config.groups;
  const group = groups.find((_group) => _group.groupId === params.groupId);
  const environments = group?.environments || [];
  const features = group?.features || [];

  const [groupName, setGroupName] = useState(group?.name);

  useEffect(() => {
    setGroupName(group?.name);
  }, [group?.name]);

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
              <CustomList<Environment>
                title="Environments"
                itemType="Environment"
                items={environments}
                getKey={(environment) => environment.name}
                onAdd={() => {
                  group.environments.push({
                    name: `Environment ${environments.length + 1}`,
                    environmentId: nanoid(),
                    defaultEnvironmentFeatureValues: cloneDeep(
                      DefaultEnvironmentDefaults
                    ),
                    features: {},
                  });
                }}
                listItem={(environment) => (
                  <CustomListItem
                    name={environment.name}
                    itemType="Environment"
                    linkPath={`/groups/${group.groupId}/environments/${environment.environmentId}`}
                    onDelete={() => {
                      group.environments = environments.filter(
                        (_environment) =>
                          _environment.environmentId !==
                          environment.environmentId
                      );
                    }}
                  />
                )}
                tooltipText={
                  "Environments are your deploy targets. These are the places where your flags may differ from each other based on Environment. (dev, staging, prod, etc)"
                }
              />
            </Box>

            <Box w="50%">
              <CustomList<Feature>
                title="Features"
                itemType="Feature"
                items={features}
                getKey={(feature) => feature.featureId}
                onAdd={() => {
                  group.features.push({
                    name: `Feature ${features.length + 1}`,
                    featureId: nanoid(),
                    type: "toggle",
                    scheduleType: "",
                  });
                }}
                listItem={(feature) => (
                  <CustomListItem
                    name={`${feature.name}`}
                    itemType="Feature"
                    linkPath={`/groups/${group.groupId}/features/${feature.featureId}`}
                    onDelete={() => {
                      group.features = features.filter(
                        (_feature) => _feature.featureId !== feature.featureId
                      );
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
