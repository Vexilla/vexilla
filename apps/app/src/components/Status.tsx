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

import { AppState } from "@vexilla/types";

import { differences, validation } from "../stores/config-valtio";
import { CustomCard } from "./CustomCard";

import { Icon } from "@iconify/react";
import settingsBroken from "@iconify/icons-solar/settings-broken";
import closeCircleBroken from "@iconify/icons-solar/close-circle-broken";
import checkCircleBroken from "@iconify/icons-solar/check-circle-broken";

import chevronRight from "@iconify/icons-octicon/chevron-right-12";
import chevronDown from "@iconify/icons-octicon/chevron-down-12";

interface StatusProps {
  config: AppState;
  showConfig: () => void;
  publish: () => Promise<void>;
}

export function Status({ config, showConfig, publish }: StatusProps) {
  const validationSnapshot = useSnapshot(validation);
  const differencesSnapshot = useSnapshot(differences);

  let validationStatus = StatusItemStatus.Good;
  let validationErrors: string[] = [];
  if (!validationSnapshot.result.success) {
    validationStatus = StatusItemStatus.Error;
    validationErrors = validationSnapshot.result.error.issues.map(
      (issue) => `${issue.path} ${issue.message}`
    );
  }

  let diffStatus = StatusItemStatus.Error;
  const diffErrors = differences.result;
  if (diffErrors.length > 0) {
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
        onViewButtonClick={() => {}}
        viewButtonDisabled={!validationErrors.length}
      >
        BAAAR
      </StatusItem>

      <ChangesStatusItem diffErrors={diffErrors} />

      <div className="w-full p-2">
        <Button
          className="w-full"
          disabled={!isPublishable}
          onClick={() => {
            publish();
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

interface StatusItemProps {
  title: string;
  status: StatusItemStatus;
  issueCount: number;
  onViewButtonClick: () => void;
  viewButtonDisabled?: boolean;
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

function StatusItem({
  title,
  status,
  issueCount,
  viewButtonDisabled = false,
  onViewButtonClick,
}: PropsWithChildren<StatusItemProps>) {
  const bgColor = statusColorMap[status].bg || "bg-slate-200";
  const countColor = statusColorMap[status].count || "bg-slate-500";

  return (
    <Box className={`m-2 p-2 ${bgColor} rounded-lg`}>
      <Flex direction="row" align={"center"} justify={"space-between"}>
        <Flex direction="row" align="center">
          <span className="m-0">{title}</span>
          <div
            className={`h-6 w-6 p-1 ${countColor} rounded-full shadow-sm text-white  flex items-center justify-center ml-2 text-xs`}
          >
            {issueCount}
          </div>
        </Flex>
        {!viewButtonDisabled && (
          <Button variant="subtle" color="dark" onClick={onViewButtonClick}>
            View
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
  diffErrors: Difference[];
}

function ChangesStatusItem({ diffErrors }: ChangesStatusItemProps) {
  const [opened, { open: openModal, close: closeModal }] = useDisclosure();
  const [approvals, setApprovals] = useState<Record<string, boolean>>({});
  // leaving off, make this actually useful
  const [collapsedDiffs, setCollapsedDiffs] = useState<Record<string, boolean>>(
    {}
  );

  let diffStatus = StatusItemStatus.Error;
  if (diffErrors.length > 0) {
    diffStatus = StatusItemStatus.Good;
  }

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

    diffErrors.forEach((change) => {
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
    diffErrors.forEach((change) => {
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

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => {
          closeModal();
          clearApprovals();
        }}
        title={"Changes"}
      >
        <Flex direction="column">
          <Flex direction="row" gap="1rem" justify={"center"} align={"center"}>
            <Box>
              <RingProgress
                size={72}
                thickness={8}
                label={
                  <Text size="xs" align="center" className="whitespace-nowrap">
                    {approvalCount}/{diffErrors.length}
                  </Text>
                }
                sections={[
                  {
                    value: (acceptedCount / diffErrors.length) * 100,
                    color: "blue",
                  },
                  {
                    value: (rejectedCount / diffErrors.length) * 100,
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
              disabled={approvalCount === diffErrors.length}
            >
              Accept All
            </Button>
            <Button
              variant="filled"
              color="red"
              onClick={rejectAll}
              disabled={approvalCount === diffErrors.length}
            >
              Reject All
            </Button>
          </Flex>
          <div className="max-h-[400px] overflow-y-auto">
            {diffErrors.map((change) => {
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
                  className={`w-full  ${bgColor} rounded`}
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
          <Flex direction="column" pt="1rem">
            {approvalCount !== diffErrors.length && (
              <Flex direction="row" justify={"flex-end"} pb="0.5rem">
                <Text color="red" align="right">
                  You must accept or reject all changes before merging.
                </Text>
              </Flex>
            )}
            <Flex
              direction="row"
              justify={"flex-end"}
              align="center"
              gap="1rem"
            >
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
                onClick={() => {}}
                disabled={approvalCount !== diffErrors.length}
              >
                Merge Changes
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Modal>
      <StatusItem
        title="Changes"
        status={diffStatus}
        issueCount={diffErrors.length || 0}
        onViewButtonClick={openModal}
        viewButtonDisabled={!diffErrors.length}
      />
    </>
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
