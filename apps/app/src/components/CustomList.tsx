import _React, { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Flex,
  ActionIcon,
  Button,
  Box,
  Text,
  Group,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { Icon } from "@iconify/react";
import addCircleBroken from "@iconify/icons-solar/add-circle-broken";
import trashBinTrashBroken from "@iconify/icons-solar/trash-bin-trash-broken";
import penBroken from "@iconify/icons-solar/pen-broken";
import { CustomCard } from "./CustomCard";

interface CustomListProps<T> {
  onAdd: () => void | Promise<void>;
  items: T[];
  title: string;
  listItem: (item: T) => ReactNode;
  getKey: (item: T) => string | number;
  itemType: string;
  tooltipText?: string;
  showCount?: boolean;
}

export function CustomList<T>({
  items,
  onAdd,
  title,
  tooltipText,
  getKey,
  listItem,
  itemType,
  showCount,
}: CustomListProps<T>) {
  return (
    <CustomCard
      title={title}
      tooltipText={tooltipText}
      count={showCount ? items.length : undefined}
      titleButtonSection={
        <>
          <Button px={6} color="primary" onClick={onAdd}>
            <Icon icon={addCircleBroken} width={24} />
            <Box ml={2} className="sr-only">
              New
            </Box>
          </Button>
        </>
      }
    >
      <ul>
        {items?.length > 0 &&
          items.map((item) => <li key={getKey(item)}>{listItem(item)}</li>)}
      </ul>
      <Flex p={"1rem"} align={"center"} justify={"center"}>
        {!items?.length && <>No {itemType}s found.</>}
      </Flex>
    </CustomCard>
  );
}

interface CustomListItemProps {
  name: string;
  itemType: string;
  linkPath?: string;
  onDelete?: () => void | Promise<void>;
  onEdit?: () => void | Promise<void>;
}

export function CustomListItem({
  name,
  linkPath,
  itemType,
  onEdit,
  onDelete,
}: CustomListItemProps) {
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  return (
    <>
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title={`Delete ${name}?`}
        centered
      >
        <p>
          Are you sure you want to delete this {itemType || "item"} named {name}
          ? This cannot be undone.
        </p>
        <Group position="right">
          <Button onClick={closeDeleteModal} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (onDelete) {
                onDelete();
              }
              closeDeleteModal();
            }}
            color="red"
          >
            Delete
          </Button>
        </Group>
      </Modal>
      <Flex
        direction="row"
        align="center"
        justify={"space-between"}
        className="py-4 px-2"
      >
        <Box className="truncate w-[calc(100%-80px)] text-left">
          {!linkPath && <Text>{name}</Text>}
          {!!linkPath && <Link to={linkPath}>{name}</Link>}
        </Box>
        <Group align="center">
          {!!onEdit && (
            <ActionIcon variant={"outline"} color="primary" onClick={onEdit}>
              <Icon icon={penBroken} />
            </ActionIcon>
          )}

          {!!linkPath && (
            <Link to={linkPath} className="flex">
              <ActionIcon variant={"outline"} color="primary">
                <Icon icon={penBroken} />
              </ActionIcon>
            </Link>
          )}

          {!!onDelete && (
            <ActionIcon variant="filled" color="red" onClick={openDeleteModal}>
              <Icon icon={trashBinTrashBroken} />
            </ActionIcon>
          )}
        </Group>
      </Flex>
    </>
  );
}
