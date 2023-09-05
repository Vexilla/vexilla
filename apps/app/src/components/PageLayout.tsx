import _React, { PropsWithChildren } from "react";

export function PageLayout({
  children,
  className,
  title,
}: PropsWithChildren<{ className?: string; title?: string }>) {
  return (
    <div
      className={`bg-grey pt-0 flex flex-col text-left max-w-lg mx-auto ${
        className || ""
      }`}
    >
      {!!title && <h2 className="font-body font-bold text-2xl">{title}</h2>}
      {children}
    </div>
  );
}
