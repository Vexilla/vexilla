import React, { PropsWithChildren } from "react";

export function PageLayout({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`bg-grey flex column align-middle justify-center ${
        className || ""
      }`}
    >
      {children}
    </div>
  );
}
