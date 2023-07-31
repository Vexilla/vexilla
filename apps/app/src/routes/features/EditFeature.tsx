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
  VexillaFeature,
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
import { logProxy } from "../../utils/logging";

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
const featureTypeOptions: {
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

  const rawEnvironments = group?.environments || {};
  const environments = Object.values(rawEnvironments);

  const features = group?.features || {};
  const feature = features[params.featureId || ""];

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

            environments.forEach((environment) => {
              environment.features = Object.values(environment.features).reduce(
                (newFeatures, envFeature) => {
                  if (feature.featureId === envFeature.featureId) {
                    envFeature.name = event.target.value;
                  }
                  newFeatures[envFeature.featureId] = envFeature;

                  return newFeatures;
                },
                {} as Record<string, VexillaFeature>
              );
            });
          }
        }}
      />

      <Select
        className="mb-8"
        label="Feature Type"
        placeholder="Pick one"
        itemComponent={SelectItem}
        data={featureTypeOptions}
        maxDropdownHeight={400}
        value={feature?.featureType}
        onChange={(value) => {
          if (
            (value === "toggle" ||
              value === "selective" ||
              value === "gradual" ||
              value === "value") &&
            feature
          ) {
            feature.featureType = value;
            environments.forEach((environment) => {
              if (!environment.features) {
                environment.features = {};
              }
              if (!environment?.features?.[feature.featureId]) {
                environment.features[feature.featureId] = {
                  ...(environment.defaultEnvironmentFeatureValues[
                    feature.featureType
                  ] as any),
                  featureId: feature.featureId,
                  name: feature.name,
                };
              } else {
                environment.features[feature.featureId] = {
                  ...(environment.defaultEnvironmentFeatureValues[
                    feature.featureType
                  ] as any),
                  featureType: value,
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
            environments[0]?.features?.[feature?.featureId || ""]?.schedule || {
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
        environments[0].features?.[feature?.featureId || ""]?.featureType ===
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

        function safelySetDetails(newDetails: Partial<VexillaFeature> = {}) {
          const defaultDetails =
            environment.defaultEnvironmentFeatureValues[
              featureDetails?.featureType
            ];
          if (!environment.features) {
            environment.features = {};
          }

          if (!feature) {
            console.error(
              "Looks like somebody forgot their towel. feature should NOT have been undefined"
            );
            return;
          }

          if (!featureDetails && defaultDetails) {
            environment.features[feature.featureId] = {
              ...defaultDetails,
              ...newDetails,
            } as VexillaFeature;
          } else if (!featureDetails && !defaultDetails) {
            // TODO: find global defaults to fall back to
            environment.features[feature.featureId] = {} as any;
          } else {
            const envFeature = environment.features[feature.featureId];
            Object.entries(newDetails).forEach(([key, value]) => {
              const featureKey = key as keyof VexillaFeature;
              (envFeature as any)[featureKey] = value;
            });
          }
        }

        return (
          <div key={environment.environmentId}>
            <h4>{environment.name}</h4>
            {(!featureDetails?.featureType ||
              featureDetails?.featureType === "toggle") && (
              <Switch
                checked={featureDetails?.value || false}
                onLabel="ON"
                offLabel="OFF"
                onChange={(event) => {
                  safelySetDetails({ value: event.currentTarget.checked });
                }}
              />
            )}
            {featureDetails?.featureType === "gradual" && (
              <>
                <CustomSlider
                  value={featureDetails?.seed || 0}
                  label={"Seed"}
                  tooltipText="This value is passed to the PRNG to get a specific subset of users."
                  onChange={(newSeed) => {
                    safelySetDetails({ seed: newSeed });
                  }}
                  showRandomButton
                />
                value = {featureDetails?.value || 0}
                <CustomSlider
                  value={featureDetails?.value || 0}
                  label={"Threshold"}
                  tooltipText="This value determines what percentage of users should see this feature."
                  onChange={(newValue) => {
                    safelySetDetails({ value: newValue });
                  }}
                />
              </>
            )}
            {featureDetails?.featureType === "selective" && (
              <SelectiveList
                items={
                  (environment.features[feature?.featureId || ""]?.value as (
                    | string
                    | number
                  )[]) || []
                }
                onListChange={(newList) => {
                  safelySetDetails({
                    value: (newList || ([] as string[])) as any,
                  });
                }}
              />
            )}

            {!!feature?.scheduleType &&
              feature?.scheduleType === "environment" && (
                <ScheduledForm
                  featureSchedule={
                    featureDetails?.schedule || {
                      start: Date.now(),
                      end: Date.now(),
                      timezone: "UTC",
                      timeType: "none",
                      startTime: 0,
                      endTime: 0,
                    }
                  }
                  onChange={(newSchedule) => {
                    safelySetDetails({ schedule: newSchedule });
                  }}
                />
              )}
          </div>
        );
      })}
    </PageLayout>
  );
}
