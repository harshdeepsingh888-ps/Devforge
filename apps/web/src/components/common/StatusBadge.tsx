import React from "react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "sm" }) => {
  const formatted = status.replace(/_/g, " ");

  let colorClasses = "bg-zinc-800 text-zinc-300 border-zinc-700";

  switch (status.toUpperCase()) {
    case "DONE":
    case "SUCCESS":
    case "ACCEPTED":
    case "APPROVED":
    case "DEPLOYED":
    case "ACTIVE":
      colorClasses = "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
      break;
    case "IN_PROGRESS":
    case "RUNNING":
    case "READY":
      colorClasses = "bg-blue-950/60 text-blue-400 border-blue-800/60";
      break;
    case "CODE_REVIEW":
    case "PROPOSED":
    case "DRAFT":
    case "STAGING":
      colorClasses = "bg-amber-950/60 text-amber-400 border-amber-800/60";
      break;
    case "BLOCKED":
    case "FAILED":
    case "REJECTED":
    case "ROLLED_BACK":
      colorClasses = "bg-rose-950/60 text-rose-400 border-rose-800/60";
      break;
    case "BACKLOG":
    case "PENDING":
    case "DEPRECATED":
    case "CANCELED":
      colorClasses = "bg-zinc-900 text-zinc-400 border-zinc-800";
      break;
  }

  const px = size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border uppercase tracking-wider ${px} ${colorClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "DONE" || status === "SUCCESS" || status === "ACCEPTED" || status === "APPROVED" || status === "ACTIVE"
            ? "bg-emerald-400"
            : status === "IN_PROGRESS" || status === "RUNNING"
            ? "bg-blue-400"
            : status === "BLOCKED" || status === "FAILED"
            ? "bg-rose-400"
            : "bg-zinc-500"
        }`}
      />
      {formatted}
    </span>
  );
};
