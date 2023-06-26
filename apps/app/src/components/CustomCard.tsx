import React, { PropsWithChildren, ReactNode } from "react";
import { Box, Flex, Text } from "@mantine/core";

import { CustomTooltip } from "./CustomTooltip";

interface CustomCardProps {
  title: string;
  titleButtonSection: ReactNode;
  tooltipText?: string;
}

export function CustomCard({
  title,
  titleButtonSection,
  tooltipText,
  children,
}: PropsWithChildren<CustomCardProps>) {
  return (
    <Box className="rounded bg-slate-50">
      <Flex
        direction={"row"}
        justify={"space-between"}
        align={"center"}
        className="p-2 bg-slate-100 rounded-t"
      >
        <Flex direction="row" align={"center"}>
          <Text className="font-bold">{title}</Text>
          {!!tooltipText && <CustomTooltip tooltipText={tooltipText} />}
        </Flex>
        <Flex direction={"row"} align={"center"} gap={2}>
          {titleButtonSection}
        </Flex>
      </Flex>
      {children}
    </Box>
  );
}
