import React from "react";
import { Flex } from "@mantine/core";

import { CustomTooltip } from "./CustomTooltip";

export function TimelineItemTitle({
  title,
  tooltipText,
}: {
  title: string;
  tooltipText?: string;
}) {
  return (
    <Flex direction="row" gap="0.25rem" className="mb-2">
      <h4 className="m-0 p-0">{title}</h4>
      {!!tooltipText && <CustomTooltip tooltipText={tooltipText} />}
    </Flex>
  );
}
