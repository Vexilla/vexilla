import React, { PropsWithChildren } from "react";

export function PageLayout({ children }: PropsWithChildren<{}>) {
  return <div className="bg-grey">{children}</div>;
}
