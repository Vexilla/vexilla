import React, { forwardRef, useCallback, useEffect, useMemo } from "react";
import {
  Group,
  Select,
  TextInput,
  Text,
  Box,
  Button,
  Switch,
  Radio,
  Flex,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSnapshot } from "valtio";

import {
  Feature,
  VexillaFeatureTypeString,
  VexillaSelectiveFeature,
} from "@vexilla/types";

import { config } from "../../stores/config-valtio";

import { PageLayout } from "../../components/PageLayout";

import { Icon } from "@iconify/react";
import rewindBackBroken from "@iconify/icons-solar/rewind-back-broken";
import { CustomSlider } from "../../components/CustomSlider";
import { SelectiveList } from "../../components/features/SelectiveList";
import { ScheduledForm } from "../../components/features/ScheduledForm";

enum FormFields {
  name = "name",
}

interface ItemProps extends React.ComponentPropsWithoutRef<"div"> {
  label: string;
  description: string;
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ label, description, ...others }: ItemProps, ref) => (
    <div ref={ref} {...others}>
      <Group noWrap>
        <div>
          <Text size="sm">{label}</Text>
          <Text size="xs" opacity={0.65}>
            {description}
          </Text>
        </div>
      </Group>
    </div>
  )
);
const data: {
  label: string;
  value: VexillaFeatureTypeString;
  description: string;
}[] = [
  {
    label: "Toggle",
    value: "toggle",
    description: "A simple on/off switch",
  },

  {
    label: "Gradual",
    value: "gradual",
    description: "Release to a random subset of users",
  },
  {
    label: "Selective",
    value: "selective",
    description: "Release to a specific subset of users",
  },
  {
    label: "Value",
    value: "value",
    description: "Release to a specific subset of users",
  },
];

export function EditFeature() {
  const params = useParams();
  useSnapshot(config);

  const navigate = useNavigate();

  const groups = config.groups;
  const group = groups.find((_group) => _group.groupId === params.groupId);

  const environments = group?.environments || [];

  const features = group?.features || [];
  const feature = features.find(
    (_feature) => _feature.featureId === params.featureId
  );

  // const form = useForm({
  //   initialValues: {
  //     [FormFields.name]: feature?.name || "",
  //   },
  //   validate: {
  //     [FormFields.name]: (value) =>
  //       (!!value ? null : "Invalid Name") ||
  //       features.filter(
  //         (_feature) =>
  //           _feature.name.toLocaleLowerCase() === value.toLocaleLowerCase()
  //       ).length < 1
  //         ? null
  //         : "Duplicate Name",
  //   },
  //   validateInputOnChange: true,
  // });

  // useEffect(() => {
  //   form.setFieldValue(FormFields.name, feature?.name || "");
  // }, [feature]);

  return (
    <PageLayout>
      <Box>
        <Button
          variant="light"
          onClick={() => {
            navigate(`/groups/${group?.groupId}`);
          }}
          leftIcon={<Icon icon={rewindBackBroken} />}
          fullWidth={false}
        >
          Back to {group?.name || "Group"}
        </Button>
      </Box>
      <h2>Edit Feature</h2>
      <TextInput
        label={"Name"}
        defaultValue={feature?.name}
        onChange={(event) => {
          if (feature) {
            feature.name = event.target.value;
          }
        }}
      />

      <Select
        className="mb-8"
        label="Feature Type"
        placeholder="Pick one"
        itemComponent={SelectItem}
        data={data}
        maxDropdownHeight={400}
        value={feature?.type}
        onChange={(value) => {
          if (
            (value === "toggle" ||
              value === "selective" ||
              value === "gradual" ||
              value === "value") &&
            feature
          ) {
            feature.type = value;
            environments.forEach((environment) => {
              if (!environment.features) {
                environment.features = {};
              }
              if (!environment?.features?.[feature.featureId]) {
                environment.features[feature.featureId] = {
                  ...(environment.defaultEnvironmentFeatureValues[
                    feature.type
                  ] as any),
                  featureId: feature.featureId,
                };
              } else {
                environment.features[feature.featureId] = {
                  ...(environment.defaultEnvironmentFeatureValues[
                    feature.type
                  ] as any),
                  type: value,
                  featureId: feature.featureId,
                };
              }
            });
          }
        }}
      />
      <Radio.Group
        name="scheduled"
        label="Schedule Type"
        value={feature?.scheduleType || ""}
        onChange={(event) => {
          if (
            (event === "" || event === "global" || event === "environment") &&
            feature
          ) {
            feature.scheduleType = event;
          }
        }}
      >
        <Flex mt="sm" mb="lg" align="center" justify="center" gap="3rem">
          <Radio value="" label="None" />
          <Radio value="global" label="Global" />
          <Radio value="environment" label="Per Environment" />
        </Flex>
      </Radio.Group>
      {!!feature?.scheduleType && feature?.scheduleType === "global" && (
        <ScheduledForm
          featureSchedule={
            environments[0].features?.[feature?.featureId || ""].schedule || {
              start: Date.now(),
              end: Date.now(),
              timezone: "UTC",
              timeType: "none",
              startTime: 0,
              endTime: 0,
            }
          }
          onChange={(newSchedule) => {
            environments.forEach((environment) => {
              const environmentFeature =
                environment.features?.[feature?.featureId || ""];
              if (environmentFeature) {
                environmentFeature.schedule = newSchedule;
              }
            });
          }}
        />
      )}

      {environments?.length > 0 &&
        environments[0].features?.[feature?.featureId || ""]?.type ===
          "selective" && (
          <Radio.Group
            name="valueType"
            label="Value Type"
            value={
              (
                environments[0].features?.[
                  feature?.featureId || ""
                ] as VexillaSelectiveFeature
              )?.valueType ||
              environments[0]?.defaultEnvironmentFeatureValues.selective
                .valueType ||
              "string"
            }
            onChange={(event) => {
              environments.forEach((environment) => {
                if (environment.features?.[feature?.featureId || ""]) {
                  (
                    environment.features?.[
                      feature?.featureId || ""
                    ] as VexillaSelectiveFeature
                  ).valueType = event as "string" | "number";
                }
              });
            }}
          >
            <Group mt="sm" mb="lg" align="center" position="center">
              <Radio value="string" label="String" mr="3rem" />
              <Radio value="number" label="Number" />
            </Group>
          </Radio.Group>
        )}

      {environments.map((environment) => {
        const featureDetails =
          environment?.features?.[feature?.featureId || ""];

        function setDefault() {
          const details =
            environment.defaultEnvironmentFeatureValues[featureDetails?.type];
          if (!environment.features) {
            environment.features = {};
          }
          if (!featureDetails && feature && details) {
            environment.features[feature.featureId] = { ...details };
          } else if (feature) {
            // TODO: find global defaults to fall back to
            environment.features[feature.featureId] = {} as any;
          }
        }

        return (
          <div key={environment.environmentId}>
            <h4>{environment.name}</h4>
            {(!featureDetails?.type || featureDetails?.type === "toggle") && (
              <Switch
                checked={featureDetails?.value || false}
                onLabel="ON"
                offLabel="OFF"
                onChange={(event) => {
                  if (featureDetails) {
                    featureDetails.value = event.currentTarget.checked;
                  } else {
                    setDefault();
                  }
                }}
              />
            )}
            {featureDetails?.type === "gradual" && (
              <>
                <CustomSlider
                  value={featureDetails.seed || 0}
                  label={"Seed"}
                  tooltipText="This value is passed to the PRNG to get a specific subset of users."
                  onChange={(newSeed) => {
                    if (featureDetails) {
                      featureDetails.seed = newSeed;
                    } else {
                      setDefault();
                    }
                  }}
                  showRandomButton
                />
                value = {featureDetails?.value || 0}
                <CustomSlider
                  value={featureDetails?.value || 0}
                  label={"Threshold"}
                  tooltipText="This value determines what percentage of users should see this feature."
                  onChange={(newValue) => {
                    if (featureDetails) {
                      featureDetails.value = newValue;
                    } else {
                      setDefault();
                    }
                  }}
                />
              </>
            )}
            {featureDetails?.type === "selective" && (
              <SelectiveList
                items={
                  (environment.features[feature?.featureId || ""]?.value as (
                    | string
                    | number
                  )[]) || []
                }
                onListChange={(newList) => {
                  (
                    environment.features[feature?.featureId || ""] as any
                  ).value = newList || ([] as string[]);
                }}
              />
            )}

            {!!feature?.scheduleType &&
              feature?.scheduleType === "environment" && (
                <ScheduledForm
                  featureSchedule={
                    featureDetails.schedule || {
                      start: Date.now(),
                      end: Date.now(),
                      timezone: "UTC",
                      timeType: "none",
                      startTime: 0,
                      endTime: 0,
                    }
                  }
                  onChange={(newSchedule) => {
                    featureDetails.schedule = newSchedule;
                  }}
                />
              )}
          </div>
        );
      })}
    </PageLayout>
  );
}
