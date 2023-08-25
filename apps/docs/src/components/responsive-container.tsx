import type { PropsWithChildren } from "react";

interface ResponsiveContainerProps {
  className?: string;
}

export function ResponsiveContainer({
  children,
  className,
}: PropsWithChildren<ResponsiveContainerProps>) {
  return (
    <div
      className={`max-w-screen-sm md:max-w-screen-sm lg:max-w-screen-md xl:max-w-screen-lg 2xl:max-w-screen-xl mx-auto ${className}`}
    >
      {children}
    </div>
  );
}
