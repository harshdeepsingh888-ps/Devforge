import React from "react";
import { PriorityBadge } from "../common/PriorityBadge";
import { StatusBadge } from "../common/StatusBadge";
import type { WorkItem } from "../../types/api.types";

interface TimelineViewProps {
  items: WorkItem[];
  onSelectItem: (item: WorkItem) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  items,
  onSelectItem,
}) => {
  const dates = ["Aug 1", "Aug 5", "Aug 10", "Aug 15", "Aug 20", "Aug 25"];

  return (
    <div className="bg-[#0d0f0f] border border-[#1c201e] p-3 overflow-x-auto space-y-3 font-mono">
      {/* Timeline Header */}
      <div className="flex border-b border-[#1c201e] pb-1.5 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
        <div className="w-64 shrink-0 text-zinc-400">
          Work Item
        </div>
        <div className="flex-1 grid grid-cols-6 gap-2 text-center">
          {dates.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      </div>

      {/* Timeline Rows */}
      <div className="space-y-1">
        {items.map((item, idx) => {
          const startCol = (idx % 3) + 1;
          const spanCols = (idx % 2) + 2;

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#111313] rounded-sm cursor-pointer transition-colors border border-transparent hover:border-[#1c201e]"
            >
              {/* Left Item Label */}
              <div className="w-64 shrink-0 flex items-center gap-2 truncate text-xs">
                <span className="font-bold text-emerald-400">{item.id}</span>
                <span className="text-zinc-200 truncate font-sans">{item.title}</span>
              </div>

              {/* Right Gantt Bar Grid */}
              <div className="flex-1 grid grid-cols-6 gap-2 items-center h-6 relative">
                <div
                  className={`h-4 rounded-sm px-2 flex items-center justify-between text-[10px] font-mono text-white transition-all ${
                    item.status === "DONE"
                      ? "bg-emerald-800/80 border border-emerald-600"
                      : item.status === "BLOCKED"
                      ? "bg-rose-900/80 border border-rose-600"
                      : "bg-[#064e3b] border border-emerald-600"
                  }`}
                  style={{
                    gridColumnStart: startCol,
                    gridColumnEnd: `span ${spanCols}`,
                  }}
                >
                  <span className="truncate">{item.status}</span>
                  <PriorityBadge priority={item.priority} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
