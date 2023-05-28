import React, { forwardRef, useCallback, useEffect, useMemo } from "react";
import { Group, Select, TextInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useAtom } from "jotai";
import { Link, useParams } from "react-router-dom";
import merge from "lodash-es/merge";

import { Feature, VexillaFeatureTypeString } from "@vexilla/types";

import { PageLayout } from "../../components/PageLayout";
import { groupsStore } from "../../stores/config";

import { Icon } from "@iconify/react";
import rewindBackBroken from "@iconify/icons-solar/rewind-back-broken";

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
];

export function EditFeature() {
  const params = useParams();

  const [groups, setGroups] = useAtom(groupsStore);
  const group = useMemo(
    () => groups.find((_group) => _group.groupId === params.groupId),
    [groups, params]
  );
  const environments = useMemo(() => group?.environments || [], [group]);
  const features = useMemo(() => group?.features || [], [group]);

  const feature = useMemo(
    () => features.find((_feature) => _feature.featureId === params.featureId),
    [features, params]
  );

  const updateFeature = useCallback(
    (updatedFeature: Partial<Feature>) => {
      const newGroups = groups.map((_group) => {
        if (_group.groupId !== group?.groupId) {
          return _group;
        }

        const newFeatures = _group.features.map((_feature) => {
          if (_feature.featureId !== feature?.featureId) {
            return _feature;
          }

          return merge(
            {
              ..._feature,
            },
            updatedFeature
          );
        });

        group.features = newFeatures;

        return {
          ...group,
        };
      });

      setGroups(newGroups);
    },
    [groups, group, feature]
  );

  const form = useForm({
    initialValues: {
      [FormFields.name]: feature?.name || "",
    },
    validate: {
      [FormFields.name]: (value) =>
        (!!value ? null : "Invalid Name") ||
        features.filter(
          (_feature) =>
            _feature.name.toLocaleLowerCase() === value.toLocaleLowerCase()
        ).length < 1
          ? null
          : "Duplicate Name",
    },
    validateInputOnChange: true,
  });

  useEffect(() => {
    form.setFieldValue(FormFields.name, feature?.name || "");
  }, [feature]);

  return (
    <PageLayout>
      <Link
        to={`/groups/${group?.groupId}`}
        className="flex flex-row items-center gap-2"
      >
        <Icon icon={rewindBackBroken} /> Back to Group
      </Link>
      <h2>Edit Feature</h2>
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
            updateFeature({ name: event.target.value });
          }}
        />

        <Select
          label="Feature Type"
          placeholder="Pick one"
          itemComponent={SelectItem}
          data={data}
          maxDropdownHeight={400}
          value={feature?.options.type}
          onChange={(value) => {
            if (["toggle", "selective", "gradual"].includes(value || "")) {
              updateFeature({ options: { type: (value || "toggle") as any } });
            }
          }}
        />
      </form>
    </PageLayout>
  );
}
