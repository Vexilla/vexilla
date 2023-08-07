import { PropsWithoutRef } from "react";

interface ItemCountBadgeProps {
  count: number | string;
  color: string;
  className?: string;
}

export function ItemCountBadge({
  count,
  color,
  className = "",
}: PropsWithoutRef<ItemCountBadgeProps>) {
  return (
    <div
      className={`h-6 w-6 p-1 ${color} rounded-full shadow-sm text-white  flex items-center justify-center mr-2 text-xs ${className}`}
    >
      {count}
    </div>
  );
}
