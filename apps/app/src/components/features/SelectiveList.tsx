import _React from "react";
import { Modal, TextInput, Group, Button } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { CustomList, CustomListItem } from "../CustomList";
import { useForm } from "@mantine/form";
import { VexillaInputType } from "@vexilla/types";

interface SelectiveListProps {
  items: (string | number)[];
  onListChange: (newItems: (string | number)[]) => void | Promise<void>;
  valueType?: VexillaInputType;
}

export function SelectiveList({
  items,
  onListChange,
  valueType = "string",
}: SelectiveListProps) {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure();

  const form = useForm({
    initialValues: {
      newValue: "" as string | number,
    },

    validate: {
      newValue: (value) => (value === 0 || !!value ? null : "Invalid value"),
    },
  });

  return (
    <>
      <Modal
        opened={modalOpened}
        onClose={() => {
          closeModal();
        }}
        title="Add Value"
      >
        <form
          onSubmit={form.onSubmit((values) => {
            let { newValue } = values;
            if (valueType === "number" && typeof newValue === "string") {
              newValue = parseFloat(newValue);
            }
            const newItems = [...items, newValue];
            onListChange(newItems);
            closeModal();
            form.reset();
          })}
        >
          <TextInput {...form.getInputProps("newValue")} label="Value" />

          <Group justify="right" mt={"1rem"}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                closeModal();
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </Group>
        </form>
      </Modal>
      <CustomList<string | number>
        title="Values"
        itemType="Value"
        items={items}
        getKey={(value) => value}
        onAdd={() => {
          openModal();
        }}
        listItem={(value) => (
          <CustomListItem
            name={`${value}`}
            itemType="Value"
            onDelete={() => {
              const newItems = items.filter((item) => item !== value);
              onListChange(newItems);
            }}
          />
        )}
        tooltipText={
          "These values will be checked against whatever value you pass at runtime. It can be a string or a number."
        }
      />
    </>
  );
}
