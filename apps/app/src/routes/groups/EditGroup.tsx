import React, { useMemo, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAtom } from "jotai";

import { Button, TextInput, Flex, Box } from "@mantine/core";
import { useForm } from "@mantine/form";

import {
  DefaultFeatureValues,
  Environment,
  Feature,
  Group as FeatureGroup,
  VexillaGradualFeature,
  VexillaSelectiveFeature,
  VexillaToggleFeature,
} from "@vexilla/types";

import { groupsStore } from "../../stores/config";
import { nanoid } from "../../utils/nanoid";

import { PageLayout } from "../../components/PageLayout";
import { CustomList, CustomListItem } from "../../components/CustomList";

enum FormFields {
  name = "name",
}

const DefaultEnvironmentDefaults: DefaultFeatureValues = {
  toggle: {
    type: "toggle",
    value: false,
  } as VexillaToggleFeature,
  gradual: {
    type: "gradual",
    seed: 0,
    value: 0,
  } as VexillaGradualFeature,
  selective: {
    type: "selective",
  } as VexillaSelectiveFeature,
} as const;

export function EditGroup() {
  const params = useParams();

  const [groups, setGroups] = useAtom(groupsStore);
  const group = useMemo(
    () => groups.find((_group) => _group.groupId === params.groupId),
    [groups, params]
  );
  const environments = useMemo(() => group?.environments || [], [group]);
  const features = useMemo(() => group?.features || [], [group]);

  const updateGroup = useCallback(
    (updatedGroup: Partial<FeatureGroup>) => {
      const newGroups = groups.map((_group) => {
        if (_group.groupId !== group?.groupId) {
          return _group;
        }
        return {
          ...group,
          ...updatedGroup,
        };
      });

      setGroups(newGroups);
    },
    [groups, group]
  );

  const form = useForm({
    initialValues: {
      [FormFields.name]: group?.name || "",
    },
    validate: {
      [FormFields.name]: (value) =>
        (!!value ? null : "Invalid Name") ||
        groups.filter(
          (_group) =>
            _group.name.toLocaleLowerCase() === value.toLocaleLowerCase()
        ).length < 1
          ? null
          : "Duplicate Name",
    },
    validateInputOnChange: true,
  });

  useEffect(() => {
    form.setFieldValue(FormFields.name, group?.name || "");
  }, [group]);

  return (
    <PageLayout>
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
          <form
            onSubmit={(event) => {
              event.preventDefault();
            }}
            onChange={(event) => {
              updateGroup({ name: (event.target as any).value });
            }}
            className="flex flex-col gap-8 mb-8"
          >
            <TextInput
              label={"Name"}
              {...form.getInputProps(FormFields.name)}
            />
          </form>
          <Flex direction="row" gap={"1rem"}>
            <Box w="50%">
              <CustomList<Environment>
                title="Environments"
                itemType="Environment"
                items={environments}
                getKey={(environment) => environment.name}
                onAdd={() => {
                  const newEnvironments: Environment[] = [
                    ...environments,
                    {
                      name: `Environment ${environments.length + 1}`,
                      environmentId: nanoid(),
                      defaultEnvironmentFeatureValues:
                        DefaultEnvironmentDefaults,
                    },
                  ];

                  updateGroup({ environments: newEnvironments });
                }}
                listItem={(environment) => (
                  <CustomListItem
                    name={environment.name}
                    itemType="Environment"
                    linkPath={`/groups/${group.groupId}/environments/${environment.environmentId}`}
                    onDelete={() => {
                      const newEnvironments = environments.filter(
                        (_environment) =>
                          _environment.environmentId !==
                          environment.environmentId
                      );

                      updateGroup({ environments: newEnvironments });
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
                  const newFeatures: Feature[] = [
                    ...features,
                    {
                      name: `Feature ${features.length + 1}`,
                      featureId: nanoid(),
                      options: {
                        type: "toggle",
                        value: false,
                      },
                    },
                  ];

                  updateGroup({ features: newFeatures });
                }}
                listItem={(feature) => (
                  <CustomListItem
                    name={`${feature.name}`}
                    itemType="Feature"
                    linkPath={`/groups/${group.groupId}/features/${feature.featureId}`}
                    onDelete={() => {
                      const newFeatures = features.filter(
                        (_feature) => _feature.featureId !== feature.featureId
                      );

                      updateGroup({ features: newFeatures });
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
