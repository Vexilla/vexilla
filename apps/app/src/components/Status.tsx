import React from "react";
import { Flex, Button, Box, Modal } from "@mantine/core";

import { AppState } from "@vexilla/types";

import { CustomCard } from "./CustomCard";

import { Icon } from "@iconify/react";
import settingsBroken from "@iconify/icons-solar/settings-broken";
import { differences, validation } from "../stores/config-valtio";
import { useSnapshot } from "valtio";
import { useDisclosure } from "@mantine/hooks";

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
  let diffErrors: string[] = [];
  if (differencesSnapshot.result.length > 0) {
    diffStatus = StatusItemStatus.Good;
    diffErrors = differencesSnapshot.result.map((difference) => {
      const { type, path } = difference;
      let diffString = `${type} : ${path.join(".")}`;
      if (type === "CREATE") {
        diffString += ` : ${difference.value}`;
      } else if (type === "REMOVE") {
        diffString += ` : ${difference.oldValue}`;
      } else if (type === "CHANGE") {
        diffString += ` : ${difference.oldValue} -> ${difference.value}`;
      }

      return diffString;
    });
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
        issues={validationErrors}
      />

      <StatusItem title="Changes" status={diffStatus} issues={diffErrors} />

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
  issues: string[];
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

function StatusItem({ title, status, issues }: StatusItemProps) {
  const bgColor = statusColorMap[status].bg || "bg-slate-200";
  const countColor = statusColorMap[status].count || "bg-slate-500";

  const [opened, { open: openModal, close: closeModal }] = useDisclosure();

  return (
    <>
      <Modal opened={opened} onClose={closeModal}>
        {issues.map((issue) => (
          <div>{issue}</div>
        ))}
      </Modal>
      <Box className={`m-2 p-2 ${bgColor} rounded-lg`}>
        <Flex direction="row" align={"center"} justify={"space-between"}>
          <Flex direction="row" align="center">
            <span className="m-0">{title}</span>
            <div
              className={`h-4 w-4 ${countColor} rounded-full shadow-sm text-white p-0 flex items-center justify-center ml-2`}
            >
              {issues.length}
            </div>
          </Flex>
          <Button
            onClick={() => {
              openModal();
            }}
          >
            View
          </Button>
        </Flex>
      </Box>
    </>
  );
}
