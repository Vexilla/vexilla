import React from "react";
import { ActionIcon, Tooltip } from "@mantine/core";

import Icon from "@iconify/react";
import infoCircleBroken from "@iconify/icons-solar/info-circle-broken";

interface CustomTooltipProps {
  tooltipText: string;
}

export function CustomTooltip({ tooltipText }: CustomTooltipProps) {
  return (
    <Tooltip
      multiline
      width={220}
      withArrow
      label={tooltipText}
      events={{ hover: true, focus: true, touch: false }}
    >
      <ActionIcon>
        <Icon icon={infoCircleBroken} />
      </ActionIcon>
    </Tooltip>
  );
}
