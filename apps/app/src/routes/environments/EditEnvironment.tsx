import React, { useCallback, useEffect, useMemo } from "react";
import {
  TextInput,
  Switch,
  Tooltip,
  ActionIcon,
  Flex,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useAtom } from "jotai";
import { Link, useParams } from "react-router-dom";
import merge from "lodash-es/merge";
import cloneDeep from "lodash-es/cloneDeep";

import { Environment, Feature } from "@vexilla/types";

import { groupsStore } from "../../stores/config";

import { PageLayout } from "../../components/PageLayout";
import { CustomSlider } from "../../components/CustomSlider";
import { CustomList, CustomListItem } from "../../components/CustomList";
import { CustomTooltip } from "../../components/CustomTooltip";

import { Icon } from "@iconify/react";
import rewindBackBroken from "@iconify/icons-solar/rewind-back-broken";
import shieldWarningBroken from "@iconify/icons-solar/shield-warning-broken";
import { RecursivePartial } from "../../utils/types";

enum FormFields {
  name = "name",
}

export function EditEnvironment() {
  const params = useParams();

  const [groups, setGroups] = useAtom(groupsStore);
  const group = groups.find((_group) => _group.groupId === params.groupId);
  const environments = group?.environments || [];

  const environment = environments.find(
    (_environment) => _environment.environmentId === params.environmentId
  );

  console.log({ groups });
  console.log({ environment });

  const updateEnvironment = (
    updatedEnvironment: RecursivePartial<Environment>
  ) => {
    console.log("groups before updates", groups);
    const newGroups = groups.map((_group) => {
      if (_group.groupId !== group?.groupId) {
        return _group;
      }

      const editedGroup = cloneDeep(group);

      const newEnvironments = _group.environments.map((_environment) => {
        if (_environment.environmentId !== environment?.environmentId) {
          return _environment;
        }

        return merge(cloneDeep(_environment), updatedEnvironment);
      });

      editedGroup.environments = newEnvironments;

      return editedGroup;
    });

    console.log({ groups, newGroups });

    setGroups(newGroups);
  };

  const form = useForm({
    initialValues: {
      [FormFields.name]: environment?.name || "",
    },
    validate: {
      [FormFields.name]: (value) =>
        (!!value ? null : "Invalid Name") ||
        environments.filter(
          (_environment) =>
            _environment.name.toLocaleLowerCase() === value.toLocaleLowerCase()
        ).length < 1
          ? null
          : "Duplicate Name",
    },
    validateInputOnChange: true,
  });

  useEffect(() => {
    form.setFieldValue(FormFields.name, environment?.name || "");
  }, [environment]);

  return (
    <PageLayout>
      <Link
        to={`/groups/${group?.groupId}`}
        className="flex flex-row items-center gap-2"
      >
        <Icon icon={rewindBackBroken} /> Back to Group
      </Link>
      <h2>Edit Environment</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        className="flex flex-col gap-8 mb-8"
      >
        <TextInput
          {...form.getInputProps(FormFields.name)}
          label={"Name"}
          onChange={(event) => {
            updateEnvironment({ name: event.target.value });
          }}
        />
      </form>
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
        These settings only take effect when creating new Features. Updating
        these settings will not modify existing Features.
      </Alert>

      <h4>Toggle</h4>
      <Switch
        checked={environment?.defaultEnvironmentFeatureValues.toggle.value}
        onLabel="ON"
        offLabel="OFF"
        onChange={(event) => {
          console.log("groups in change:", groups, groupsStore.toString());
          updateEnvironment({
            defaultEnvironmentFeatureValues: {
              ...environment?.defaultEnvironmentFeatureValues,
              toggle: {
                type: "toggle",
                value: event.currentTarget.checked,
              },
            },
          });
        }}
      />

      <h4>Gradual</h4>
      <CustomSlider
        value={environment?.defaultEnvironmentFeatureValues.gradual?.seed || 0}
        label={"Seed"}
        tooltipText="This value is passed to the PRNG to get a specific subset of users."
        onChange={(newSeed) => {
          console.log("groups in change:", groups);
          console.log("WTF", { newSeed });

          const update = {
            defaultEnvironmentFeatureValues: {
              gradual: {
                type: "gradual",
                seed: newSeed,
              },
            },
          };

          console.log({ update });
          updateEnvironment({
            defaultEnvironmentFeatureValues: {
              ...environment?.defaultEnvironmentFeatureValues,
              gradual: {
                seed: newSeed,
              },
            },
          });
        }}
        showRandomButton
      />
      <CustomSlider
        value={environment?.defaultEnvironmentFeatureValues.gradual?.value || 0}
        label={"Threshold"}
        tooltipText="This value determines what percentage of users should see this feature."
        onChange={(newValue) => {
          console.log({ newValue });
          updateEnvironment({
            defaultEnvironmentFeatureValues: {
              ...environment?.defaultEnvironmentFeatureValues,
              gradual: {
                type: "gradual",
                value: newValue,
              },
            },
          });
        }}
      />

      <h4>Selective</h4>
      <CustomList<string | number>
        title="Values"
        itemType="Value"
        items={[]}
        getKey={(value) => value}
        onAdd={() => {}}
        listItem={(value) => (
          <CustomListItem
            name={`${value}`}
            itemType="Value"
            onDelete={() => {}}
          />
        )}
        tooltipText={
          "These values will be checked against whatever value you pass at runtime. It can be a string or a number."
        }
      />
    </PageLayout>
  );
}
