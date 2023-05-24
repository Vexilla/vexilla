import React from "react";
import { PageLayout } from "../../components/PageLayout";
import { useForm } from "@mantine/form";
import { Group, Button, TextInput } from "@mantine/core";
import { Environment, Feature } from "@vexilla/types";

enum FormFields {
  name = "name",
  environments = "environments",
  features = "features",
}

export function EditGroup() {
  const form = useForm({
    initialValues: {
      [FormFields.name]: "",
      [FormFields.environments]: [] as Environment[],
      [FormFields.features]: [] as Feature[],
    },
    validate: {
      [FormFields.name]: (value) => (!!value ? null : "Invalid Name"),
    },
  });

  return (
    <PageLayout>
      <h2>Edit Group</h2>
      <form onSubmit={() => {}} onChange={() => {}}>
        <TextInput label={"Name"} {...form.getInputProps(FormFields.name)} />

        <Group position="right" mt="md">
          <Button type="submit">Submit</Button>
        </Group>
      </form>
    </PageLayout>
  );
}
