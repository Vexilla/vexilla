import React, { useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
import { useSnapshot } from "valtio";

import { config } from "../../stores/config-valtio";
import { nanoid } from "../../utils/nanoid";

import { PageLayout } from "../../components/PageLayout";
import { CustomList, CustomListItem } from "../../components/CustomList";

import { Icon } from "@iconify/react";
import rewindBackBroken from "@iconify/icons-solar/rewind-back-broken";

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
    valueType: "string",
    value: [],
  } as VexillaSelectiveFeature,
} as const;

export function EditGroup() {
  const params = useParams();
  useSnapshot(config);

  const navigate = useNavigate();

  const groups = config.groups;

  const group = groups.find((_group) => _group.groupId === params.groupId);
  const environments = group?.environments || [];
  const features = group?.features || [];

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
          <form
            onSubmit={(event) => {
              event.preventDefault();
            }}
            onChange={(event) => {}}
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
                  group.environments.push({
                    name: `Environment ${environments.length + 1}`,
                    environmentId: nanoid(),
                    defaultEnvironmentFeatureValues: DefaultEnvironmentDefaults,
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
