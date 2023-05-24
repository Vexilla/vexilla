import { Box } from "@mantine/core";
import React, { PropsWithChildren } from "react";

export function PageLayout({
  children,
  className,
  title,
}: PropsWithChildren<{ className?: string; title?: string }>) {
  return (
    <div className={`bg-grey flex flex-col ${className || ""}`}>
      {!!title && (
        <h2 className="font-body font-bold text-2xl text-left">{title}</h2>
      )}
      {children}
    </div>
  );
}
