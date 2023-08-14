import React, { useCallback, useEffect, useMemo } from "react";
import {
  TextInput,
  Switch,
  Flex,
  Alert,
  Button,
  Box,
  Radio,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useSnapshot } from "valtio";

import { config } from "../../stores/config-valtio";

import { PageLayout } from "../../components/PageLayout";
import { CustomSlider } from "../../components/CustomSlider";
import { CustomTooltip } from "../../components/CustomTooltip";
import { SelectiveList } from "../../components/features/SelectiveList";
import { ScheduledForm } from "../../components/features/ScheduledForm";

import { Icon } from "@iconify/react";
import rewindBackBroken from "@iconify/icons-solar/rewind-back-broken";
import shieldWarningBroken from "@iconify/icons-solar/shield-warning-broken";

enum FormFields {
  name = "name",
}

export function EditEnvironment() {
  const navigate = useNavigate();
  const params = useParams();
  useSnapshot(config);

  const groups = config.groups;

  const group = groups.find((_group) => _group.groupId === params.groupId);
  const environments = group?.environments || {};

  const environment = environments[params.environmentId || ""];

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
      <h2>Edit Environment</h2>
      <TextInput
        className="mb-8"
        defaultValue={environment?.name}
        label={"Name"}
        onChange={(event) => {
          if (environment) {
            environment.name = event.target.value;
          }
        }}
      />
      <Flex direction="row" align="center">
        <h3>Defaults</h3>
        <CustomTooltip
          tooltipText={
            "Configure the default values for your feature flags in this environment."
          }
        />
      </Flex>
      <Alert
        icon={<Icon icon={shieldWarningBroken} width={"2rem"} />}
        title="Warning"
        color="yellow"
      >
        These settings only take effect when creating new Features or changing a
        Feature's type. Updating these settings here will not modify existing
        Features.
      </Alert>

      <h4>Toggle</h4>
      <Switch
        checked={environment?.defaultEnvironmentFeatureValues.toggle.value}
        onLabel="ON"
        offLabel="OFF"
        onChange={(event) => {
          if (environment) {
            environment.defaultEnvironmentFeatureValues.toggle.value =
              event.currentTarget.checked;
          }
        }}
      />

      <h4>Gradual</h4>
      <CustomSlider
        value={environment?.defaultEnvironmentFeatureValues.gradual?.seed || 0}
        label={"Seed"}
        tooltipText="This value is passed to the PRNG to get a specific subset of users."
        onChange={(newSeed) => {
          if (environment) {
            environment.defaultEnvironmentFeatureValues.gradual.seed = newSeed;
          }
        }}
        showRandomButton
      />
      <CustomSlider
        value={environment?.defaultEnvironmentFeatureValues.gradual?.value || 0}
        label={"Threshold"}
        tooltipText="This value determines what percentage of users should see this feature."
        onChange={(newValue) => {
          if (environment) {
            environment.defaultEnvironmentFeatureValues.gradual.value =
              newValue;
          }
        }}
      />

      <h4>Selective</h4>
      <Radio.Group
        name="valueType"
        label="Value Type"
        value={
          environment?.defaultEnvironmentFeatureValues.selective.valueType ||
          "string"
        }
        onChange={(event) => {
          environment.defaultEnvironmentFeatureValues.selective.valueType =
            event as "string" | "number";
        }}
      >
        <Group mt="sm" mb="lg" align="center" position="center">
          <Radio value="string" label="String" mr="3rem" />
          <Radio value="number" label="Number" />
        </Group>
      </Radio.Group>
      <SelectiveList
        valueType={
          environment?.defaultEnvironmentFeatureValues.selective.valueType
        }
        items={
          environment?.defaultEnvironmentFeatureValues.selective.value || []
        }
        onListChange={(newValue) => {
          if (environment) {
            if (
              environment.defaultEnvironmentFeatureValues.selective
                .valueType === "string"
            ) {
              environment.defaultEnvironmentFeatureValues.selective.value =
                (newValue as string[]) || [];
            } else if (
              environment.defaultEnvironmentFeatureValues.selective
                .valueType === "number"
            ) {
              environment.defaultEnvironmentFeatureValues.selective.value =
                (newValue as number[]) || [];
            }
          }
        }}
      />
    </PageLayout>
  );
}
