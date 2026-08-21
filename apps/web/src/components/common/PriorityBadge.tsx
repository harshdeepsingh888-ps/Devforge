import React from "react";
import type { WorkItemPriority } from "../../types/api.types";

interface PriorityBadgeProps {
  priority: WorkItemPriority | string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let color = "bg-zinc-800 text-zinc-400 border-zinc-700";

  switch (priority) {
    case "P0":
      color = "bg-rose-950/80 text-rose-300 border-rose-700 font-bold";
      break;
    case "P1":
      color = "bg-amber-950/70 text-amber-300 border-amber-700";
      break;
    case "P2":
      color = "bg-blue-950/50 text-blue-300 border-blue-800";
      break;
    case "P3":
      color = "bg-zinc-900 text-zinc-400 border-zinc-800";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded border uppercase ${color}`}
    >
      {priority}
    </span>
  );
};
