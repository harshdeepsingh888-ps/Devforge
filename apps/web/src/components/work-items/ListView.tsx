import React from "react";
import { GitBranch } from "lucide-react";
import { PriorityBadge } from "../common/PriorityBadge";
import { StatusBadge } from "../common/StatusBadge";
import { UserAvatar } from "../common/UserAvatar";
import type { WorkItem } from "../../types/api.types";

interface ListViewProps {
  items: WorkItem[];
  selectedItem: WorkItem | null;
  onSelectItem: (item: WorkItem) => void;
}

export const ListView: React.FC<ListViewProps> = ({
  items,
  selectedItem,
  onSelectItem,
}) => {
  return (
    <div className="bg-[#0d0f0f] border border-[#1c201e] overflow-hidden font-mono">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#1c201e] bg-[#090a0a] text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            <th className="py-2 px-3">ID</th>
            <th className="py-2 px-3">Title</th>
            <th className="py-2 px-3">State</th>
            <th className="py-2 px-3">Assignee</th>
            <th className="py-2 px-3">Team</th>
            <th className="py-2 px-3">Branch</th>
            <th className="py-2 px-3">Priority</th>
            <th className="py-2 px-3">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1c201e] font-sans">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="py-8 text-center text-zinc-500 font-mono text-xs"
              >
                No work items in stream.
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectItem(item)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#064e3b]/40 text-emerald-300 font-semibold"
                      : "hover:bg-[#111313] text-zinc-300"
                  }`}
                >
                  <td className="py-1.5 px-3 font-mono font-bold text-emerald-400">
                    {item.id}
                  </td>
                  <td className="py-1.5 px-3 font-medium text-zinc-200 truncate max-w-xs">
                    {item.title}
                  </td>
                  <td className="py-1.5 px-3 font-mono">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-1.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar name="Alice Dev" size="sm" />
                      <span className="text-zinc-400 font-mono text-[10px]">
                        @dev
                      </span>
                    </div>
                  </td>
                  <td className="py-1.5 px-3 font-mono text-zinc-400 text-[10px]">
                    Engineering
                  </td>
                  <td className="py-1.5 px-3 font-mono text-emerald-500/80 text-[10px]">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      feature
                    </span>
                  </td>
                  <td className="py-1.5 px-3 font-mono">
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="py-1.5 px-3 font-mono text-zinc-500 text-[10px]">
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
