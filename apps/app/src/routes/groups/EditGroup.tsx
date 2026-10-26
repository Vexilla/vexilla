import _React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button, TextInput, Flex, Box } from "@mantine/core";

import { VexillaEnvironment, VexillaFeature } from "@vexilla/publishing";
import { useSnapshot } from "valtio";

import { config } from "../../stores/config-valtio";
import { nanoid } from "../../utils/nanoid";

import { PageLayout } from "../../components/PageLayout";
import { CustomList, CustomListItem } from "../../components/CustomList";

import { Icon } from "@iconify/react";
import rewindBackBroken from "@iconify/icons-solar/rewind-back-broken";
import { addFeature, createEnvironment } from "@vexilla/publishing";

export function EditGroup() {
  const params = useParams();
  useSnapshot(config);

  const navigate = useNavigate();

  const groups = config.groups;
  const group = groups.find((_group) => _group.groupId === params.groupId);
  const environments = group?.environments || {};
  const features = group?.features || {};

  const [groupName, setGroupName] = useState(group?.name);
  const [groupIdDraft, setGroupIdDraft] = useState(group?.groupId || "");

  useEffect(() => {
    setGroupName(group?.name);
  }, [group?.name]);
  useEffect(() => {
    setGroupIdDraft(group?.groupId || "");
  }, [group?.groupId]);

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
          leftSection={<Icon icon={rewindBackBroken} />}
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
          <details className="mb-8">
            <summary>Group identifier</summary>
            <TextInput
              label="Group ID"
              value={groupIdDraft}
              onChange={(event) => setGroupIdDraft(event.currentTarget.value)}
              description="Changing this ID changes the group file name and SDK ID lookups."
            />
            <Button
              mt="xs"
              disabled={
                !groupIdDraft ||
                ["manifest", "config", ".", ".."].includes(groupIdDraft) ||
                /[/\\\0]/.test(groupIdDraft)
              }
              onClick={() => {
                group.groupId = groupIdDraft;
                navigate(`/groups/${encodeURIComponent(groupIdDraft)}`);
              }}
            >
              Apply group ID
            </Button>
          </details>
          <Flex direction="row" gap={"1rem"}>
            <Box w="50%">
              <CustomList<VexillaEnvironment>
                title="Environments"
                itemType="Environment"
                items={Object.values(environments)}
                getKey={(environment) => environment.name}
                showCount
                onAdd={() => {
                  const environmentId = nanoid();
                  group.environments[environmentId] = createEnvironment(
                    group,
                    environmentId,
                    `Environment ${Object.keys(environments).length + 1}`
                  );
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
                  addFeature(group, featureId, featureName);
                }}
                listItem={(feature) => (
                  <CustomListItem
                    name={`${feature.name}`}
                    itemType="Feature"
                    linkPath={`/groups/${group.groupId}/features/${feature.featureId}`}
                    onDelete={() => {
                      delete group.features[feature.featureId];
                      Object.values(group.environments).forEach(
                        (env) => delete env.features[feature.featureId]
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
