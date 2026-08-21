import React from "react";
import { AlertCircle, GitBranch } from "lucide-react";
import { PriorityBadge } from "../common/PriorityBadge";
import { UserAvatar } from "../common/UserAvatar";
import type { WorkItem } from "../../types/api.types";

interface WorkItemCardProps {
  item: WorkItem;
  isSelected?: boolean;
  onSelect: (item: WorkItem) => void;
}

export const WorkItemCard: React.FC<WorkItemCardProps> = ({
  item,
  isSelected = false,
  onSelect,
}) => {
  const isBlocked = item.status === "BLOCKED";

  return (
    <div
      onClick={() => onSelect(item)}
      className={`relative p-2 border-b border-[#161a18] transition-all duration-150 cursor-pointer bg-[#080a09] hover:bg-[#0b0f0d] hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15)] font-mono ${
        isSelected
          ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
          : isBlocked
          ? "border-rose-900/60 bg-rose-950/10 hover:border-rose-700"
          : "hover:border-[#1c201e]"
      }`}
    >
      {/* Top Header Line: ID & Priority */}
      <div className="flex items-center justify-between gap-1.5 mb-1 text-[11px]">
        <span className="font-bold text-emerald-400 font-mono">
          {item.id}
        </span>
        <div className="flex items-center gap-1">
          {isBlocked && (
            <span className="px-1 py-0.2 bg-rose-950/80 border border-rose-800 text-[9px] font-mono text-rose-400 uppercase font-bold">
              BLOCKED
            </span>
          )}
          <span className="text-[9px] text-[#6b7280] uppercase font-mono">
            {item.type}
          </span>
          <PriorityBadge priority={item.priority} />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[13px] font-medium text-[#e5e7eb] line-clamp-2 leading-snug mb-1.5 font-sans">
        {item.title}
      </h3>

      {/* Footer Info Strip */}
      <div className="space-y-0.5 text-[11px] text-[#6b7280] pt-1 border-t border-[#161a18] font-mono">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <UserAvatar name="Alice Dev" size="sm" />
            <span className="text-[#6b7280]">@dev • Core</span>
          </div>
          {item.estimate && <span className="text-[#6b7280]">{item.estimate}</span>}
        </div>
        <div className="flex items-center justify-between text-[#6b7280] pt-0.5">
          <span className="flex items-center gap-1 text-emerald-500/80">
            <GitBranch className="w-3 h-3" />
            <span>feature</span>
          </span>
        </div>
      </div>
    </div>
  );
};
