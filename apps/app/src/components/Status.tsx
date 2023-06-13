import React from "react";
import { ActionIcon, Flex } from "@mantine/core";

import { AppState } from "@vexilla/types";

import { Icon } from "@iconify/react";
import settingsBroken from "@iconify/icons-solar/settings-broken";

interface StatusProps {
  config: AppState;
  showConfig: () => void;
}

export function Status({ config, showConfig }: StatusProps) {
  return (
    <Flex direction="row" justify={"space-between"}>
      <span>Configuration</span>
      <ActionIcon onClick={showConfig}>
        <Icon icon={settingsBroken} />
      </ActionIcon>
    </Flex>
  );
}
