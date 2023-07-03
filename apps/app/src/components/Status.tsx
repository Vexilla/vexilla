import React, { PropsWithChildren, useState } from "react";
import { useSnapshot } from "valtio";
import { Difference } from "microdiff";
import {
  Flex,
  Button,
  Box,
  Modal,
  Text,
  Group,
  ActionIcon,
  RingProgress,
  Collapse,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import dayjs from "dayjs";

import { AppState } from "@vexilla/types";

import { differences, validation } from "../stores/config-valtio";
import { CustomCard } from "./CustomCard";

import { Icon } from "@iconify/react";
import settingsBroken from "@iconify/icons-solar/settings-broken";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import checkCircleBroken from "@iconify/icons-solar/check-circle-broken";
import arrowRightBroken from "@iconify/icons-solar/arrow-right-broken";

import chevronRight from "@iconify/icons-octicon/chevron-right-12";
import chevronDown from "@iconify/icons-octicon/chevron-down-12";

interface StatusProps {
  config: AppState;
  showConfig: () => void;
  publish: (
    changes: Difference[],
    approvals: Record<string, boolean>
  ) => Promise<void>;
}

export function Status({ config, showConfig, publish }: StatusProps) {
  const validationSnapshot = useSnapshot(validation);
  const differencesSnapshot = useSnapshot(differences);

  const [
    publishModalOpened,
    { open: openPublishModal, close: closePublishModal },
  ] = useDisclosure();

  let validationStatus = StatusItemStatus.Good;
  let validationErrors: string[] = [];
  if (!validationSnapshot.result.success) {
    validationStatus = StatusItemStatus.Error;
    validationErrors = validationSnapshot.result.error.issues.map(
      (issue) => `${issue.path} ${issue.message}`
    );
  }

  const modifiedAtChange = differences.result.find(
    (change) => change.path.join(".") === "modifiedAt"
  );

  const changes = differences.result.filter(
    (change) => change.path.join(".") !== "modifiedAt"
  );

  let diffStatus = StatusItemStatus.Error;
  if (changes.length > 0) {
    diffStatus = StatusItemStatus.Good;
  }

  const isPublishable =
    validationStatus === StatusItemStatus.Good &&
    diffStatus === StatusItemStatus.Good;

  return (
    <CustomCard
      title="Status"
      tooltipText="This section shows the overall status of the config. Validation errors, Diff status, etc."
      titleButtonSection={
        <>
          <Button
            onClick={showConfig}
            leftIcon={<Icon icon={settingsBroken} />}
          >
            Config
          </Button>
        </>
      }
    >
      <StatusItem
        title="Validation"
        status={validationStatus}
        issueCount={validationErrors.length || 0}
        actionButtonLabel="Edit"
        onActionButtonClick={showConfig}
        actionButtonDisabled={!validationErrors.length}
      />

      {/* <ChangesStatusItem
        changes={changes}
        modifiedAtChange={modifiedAtChange}
      /> */}

      <StatusItem
        title="Changes"
        status={diffStatus}
        issueCount={changes.length || 0}
        onActionButtonClick={() => {}}
        actionButtonDisabled={true}
        disabled={validationErrors.length > 0}
      />

      <PublishModal
        changes={changes}
        modifiedAtChange={modifiedAtChange}
        opened={publishModalOpened}
        closeModal={closePublishModal}
        publish={publish}
      />

      {!isPublishable && (
        <Flex align="center" justify="center">
          <Text color="red" p={"0.5rem"} align="center">
            {validationErrors.length > 0
              ? "There are errors with your hosting/git config."
              : "There are no changes to publish."}
          </Text>
        </Flex>
      )}

      <div className="w-full p-2">
        <Button
          className="w-full"
          disabled={!isPublishable}
          onClick={() => {
            openPublishModal();
          }}
        >
          Publish
        </Button>
      </div>
    </CustomCard>
  );
}

enum StatusItemStatus {
  Good = "good",
  Info = "info",
  Warning = "warning",
  Error = "error",
}

const statusColorMap: Record<
  StatusItemStatus,
  {
    bg: string;
    count: string;
  }
> = {
  [StatusItemStatus.Good]: {
    bg: "bg-green-50",
    count: "bg-green-500",
  },
  [StatusItemStatus.Info]: {
    bg: "bg-blue-50",
    count: "bg-blue-500",
  },
  [StatusItemStatus.Warning]: {
    bg: "bg-yellow-50",
    count: "bg-yellow-500",
  },
  [StatusItemStatus.Error]: {
    bg: "bg-red-50",
    count: "bg-red-500",
  },
};

interface StatusItemProps {
  title: string;
  status: StatusItemStatus;
  issueCount: number;
  actionButtonLabel?: string;
  onActionButtonClick: () => void;
  actionButtonDisabled?: boolean;
  disabled?: boolean;
}

function StatusItem({
  title,
  status,
  issueCount,
  actionButtonLabel = "View",
  actionButtonDisabled = false,
  onActionButtonClick,
  disabled = false,
}: PropsWithChildren<StatusItemProps>) {
  let bgColor = statusColorMap[status].bg || "bg-slate-200";
  const countColor = statusColorMap[status].count || "bg-slate-500";

  if (disabled) {
    bgColor = "bg-slate-200";
  }

  return (
    <Box className={`m-2 p-2 ${bgColor} rounded-lg`}>
      <Flex direction="row" align={"center"} justify={"space-between"}>
        <Flex direction="row" align="center">
          <span className="m-0">{title}</span>
          {!disabled && (
            <div
              className={`h-6 w-6 p-1 ${countColor} rounded-full shadow-sm text-white  flex items-center justify-center ml-2 text-xs`}
            >
              {issueCount}
            </div>
          )}
        </Flex>
        {!actionButtonDisabled && (
          <Button variant="subtle" color="dark" onClick={onActionButtonClick}>
            {actionButtonLabel}
          </Button>
        )}
      </Flex>
    </Box>
  );
}

const changeTypeColors = {
  CREATE: {
    label: "text-green-500",
  },
  REMOVE: {
    label: "text-red-500",
  },
  CHANGE: {
    label: "text-blue-500",
  },
};

const changeResultColors = {
  true: "bg-blue-50",
  false: "bg-red-50",
};

interface ChangesStatusItemProps {
  changes: Difference[];
  modifiedAtChange?: Difference;
  opened: boolean;
  closeModal: () => void;
  publish: (
    changes: Difference[],
    approvals: Record<string, boolean>
  ) => Promise<void>;
}

function PublishModal({
  changes,
  modifiedAtChange,
  opened,
  closeModal,
  publish,
}: ChangesStatusItemProps) {
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  const [collapsedDiffs, setCollapsedDiffs] = useState<Record<string, boolean>>(
    {}
  );

  const approvalCount = Object.keys(approvals).length;
  const acceptedCount = Object.values(approvals).filter(
    (approvalValue) => approvalValue === true
  ).length;
  const rejectedCount = Object.values(approvals).filter(
    (approvalValue) => approvalValue === false
  ).length;

  const clearApprovals = () => {
    setApprovals({});
    setCollapsedDiffs({});
  };

  const acceptAll = () => {
    const newApprovals: Record<string, boolean> = {};
    const newCollapsedDiffs: Record<string, boolean> = {};

    changes.forEach((change) => {
      const changePath = change.path.join(".");
      newApprovals[changePath] = true;
      newCollapsedDiffs[changePath] = true;
    });
    setApprovals(newApprovals);
    setCollapsedDiffs(newCollapsedDiffs);
  };

  const rejectAll = () => {
    const newApprovals: Record<string, boolean> = {};
    const newCollapsedDiffs: Record<string, boolean> = {};
    changes.forEach((change) => {
      const changePath = change.path.join(".");
      newApprovals[changePath] = false;
      newCollapsedDiffs[changePath] = true;
    });
    setApprovals(newApprovals);
    setCollapsedDiffs(newCollapsedDiffs);
  };
  const acceptOne = (change: Difference) => {
    const changePath = change.path.join(".");
    setApprovals({
      ...approvals,
      [change.path.join(".")]: true,
    });

    setCollapsedDiffs({
      ...collapsedDiffs,
      [changePath]: true,
    });
  };
  const rejectOne = (change: Difference) => {
    const changePath = change.path.join(".");
    setApprovals({
      ...approvals,
      [change.path.join(".")]: false,
    });

    setCollapsedDiffs({
      ...collapsedDiffs,
      [changePath]: true,
    });
  };

  const dateFormat = "MMM DD, YYYY hh:mma";

  return (
    <Modal
      opened={opened}
      onClose={() => {
        closeModal();
        clearApprovals();
      }}
      title={"Changes"}
    >
      <Flex direction="column">
        {!!modifiedAtChange &&
          (modifiedAtChange.type === "CHANGE" ||
            modifiedAtChange.type === "CREATE") && (
            <Flex direction="row" justify={"space-between"} align={"center"}>
              <Flex direction="column" align="center" w={"40%"}>
                <Text color="gray" size="sm">
                  Remote Timestamp
                </Text>
                {modifiedAtChange.type === "CHANGE" && (
                  <Text>
                    {(modifiedAtChange.oldValue &&
                      dayjs(modifiedAtChange.oldValue).format(dateFormat)) ||
                      "NULL"}
                  </Text>
                )}
                {modifiedAtChange.type === "CREATE" && <Text>NULL</Text>}
              </Flex>
              <Text color="blue">
                <Icon width={"2rem"} icon={arrowRightBroken} />
              </Text>
              <Flex direction="column" align="center" w={"40%"}>
                <Text color="gray" size="sm">
                  Local Timestamp
                </Text>
                <Text>{dayjs(modifiedAtChange.value).format(dateFormat)}</Text>
              </Flex>
            </Flex>
          )}
        <Flex direction="row" gap="1rem" justify={"center"} align={"center"}>
          <Box>
            <RingProgress
              size={72}
              thickness={8}
              label={
                <Text size="xs" align="center" className="whitespace-nowrap">
                  {approvalCount}/{changes.length}
                </Text>
              }
              sections={[
                {
                  value: (acceptedCount / changes.length) * 100,
                  color: "blue",
                },
                {
                  value: (rejectedCount / changes.length) * 100,
                  color: "red",
                },
              ]}
            />
          </Box>
          <Button
            variant="outline"
            onClick={clearApprovals}
            disabled={approvalCount === 0}
          >
            Reset
          </Button>
          <Button
            variant="filled"
            onClick={acceptAll}
            disabled={approvalCount === changes.length}
          >
            Accept All
          </Button>
          <Button
            variant="filled"
            color="red"
            onClick={rejectAll}
            disabled={approvalCount === changes.length}
          >
            Reject All
          </Button>
        </Flex>
        <div className="max-h-[400px] overflow-y-auto">
          {changes.map((change) => {
            const changePath = change.path.join(".");
            const approved = typeof approvals[changePath] === "undefined";
            const bgColor = approved
              ? "bg-gray-100"
              : changeResultColors[`${approvals[changePath]}`];

            return (
              <Flex
                direction="row"
                justify={"space-between"}
                p={"0.5rem"}
                my={"0.5rem"}
                className={`w-full ${bgColor} rounded`}
              >
                <Box className="w-full truncate">
                  <Flex direction="row" gap="1rem" justify={"space-between"}>
                    <Flex
                      direction="row"
                      gap="1rem"
                      align="center"
                      justify={"flex-start"}
                      className="w-[calc(100%-100px)]"
                    >
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        title={
                          collapsedDiffs[changePath] ? "Expand" : "Collapse"
                        }
                        onClick={() => {
                          const newCollapsedDiffs = {
                            ...collapsedDiffs,
                            [changePath]: !collapsedDiffs[changePath],
                          };

                          setCollapsedDiffs(newCollapsedDiffs);
                        }}
                      >
                        {collapsedDiffs[changePath] ? (
                          <Icon icon={chevronRight} />
                        ) : (
                          <Icon icon={chevronDown} />
                        )}
                      </ActionIcon>
                      <Text
                        className={`${
                          changeTypeColors[change.type].label
                        } font-bold`}
                      >
                        {change.type}
                      </Text>
                      <Text title={changePath} className="truncate">
                        {changePath}
                      </Text>
                    </Flex>
                    <Group className="w-[100px] justify-end pr-[0.5rem]">
                      <ActionIcon
                        size={"sm"}
                        variant="filled"
                        color="blue"
                        title="Accept Change"
                        onClick={() => {
                          acceptOne(change);
                        }}
                      >
                        <Icon icon={checkCircleBroken} />
                      </ActionIcon>
                      <ActionIcon
                        size={"sm"}
                        variant="filled"
                        color="red"
                        title="Reject Change"
                        onClick={() => {
                          rejectOne(change);
                        }}
                      >
                        <Icon icon={closeCircleBroken} />
                      </ActionIcon>
                    </Group>
                  </Flex>

                  <Collapse in={!collapsedDiffs[changePath]}>
                    <Text className="truncate bg-slate-50 px-2 mt-2">
                      <pre>
                        <code>{formatDifferenceText(change)}</code>
                      </pre>
                    </Text>
                  </Collapse>
                </Box>
              </Flex>
            );
          })}
        </div>
        <Flex direction="column">
          {approvalCount !== changes.length && (
            <Flex direction="row" justify={"flex-end"} pb="0.5rem">
              <Text color="red" align="right">
                You must accept or reject each change before merging.
              </Text>
            </Flex>
          )}
          <Flex direction="row" justify={"flex-end"} align="center" gap="1rem">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => {
                closeModal();
                clearApprovals();
              }}
            >
              Cancel
            </Button>

            <Button
              variant="filled"
              onClick={() => {
                publish(changes, approvals);
              }}
              disabled={approvalCount !== changes.length}
            >
              Publish Changes
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  );
}

function formatDifferenceText(change: Difference) {
  switch (change.type) {
    case "CHANGE":
      return `${JSON.stringify(change.oldValue, null, 1)} => ${JSON.stringify(
        change.value,
        null,
        1
      )}`;
    case "CREATE":
      return `${JSON.stringify(change.value, null, 1)}`;
    case "REMOVE":
      return `${JSON.stringify(change.oldValue, null, 1)}`;
    default:
      return ``;
  }
}
