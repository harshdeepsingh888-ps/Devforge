import React, { useEffect, useState } from "react";
import {
  Activity,
  GitBranch,
  GitPullRequest,
  Play,
  X,
} from "lucide-react";
import { PriorityBadge } from "../common/PriorityBadge";
import { StatusBadge } from "../common/StatusBadge";
import { useWorkspace } from "../../context/WorkspaceContext";
import { apiService } from "../../services/api.service";
import type { WorkItem, WorkItemPriority, WorkItemStatus } from "../../types/api.types";

interface WorkItemInspectorProps {
  item: WorkItem | null;
  onClose: () => void;
  onUpdateStatus: (itemId: string, newStatus: WorkItemStatus) => void;
}

export const WorkItemInspector: React.FC<WorkItemInspectorProps> = ({
  item,
  onClose,
  onUpdateStatus,
}) => {
  const { activeWorkspace } = useWorkspace();
  const [liveItem, setLiveItem] = useState<WorkItem | null>(item);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setLiveItem(item);
    if (item && activeWorkspace) {
      apiService
        .getWorkItemHistory(activeWorkspace.id, item.id)
        .then((h) => setHistory(h))
        .catch(() => setHistory([]));
    }
  }, [item?.id, activeWorkspace?.id]);

  // Keyboard shortcut listener: ESC closes panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const active = liveItem || item;

  const statuses: WorkItemStatus[] = [
    "BACKLOG",
    "READY",
    "IN_PROGRESS",
    "CODE_REVIEW",
    "DONE",
    "BLOCKED",
  ];

  const priorities: WorkItemPriority[] = ["P0", "P1", "P2", "P3"];

  const handlePriorityChange = async (newPriority: WorkItemPriority) => {
    if (!activeWorkspace) return;
    setLiveItem((prev) => (prev ? { ...prev, priority: newPriority } : null));
    try {
      await apiService.updateWorkItem(activeWorkspace.id, active.id, {
        priority: newPriority,
      });
    } catch (err) {
      console.error("Failed to update priority:", err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xs bg-[#050706] border-l border-[#161a18] shadow-2xl flex flex-col font-mono text-xs animate-slide-in-right relative before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500/30 before:to-transparent">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#161a18] bg-[#050706]">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-emerald-400 font-mono">{active.id}</span>
          <span className="text-[9px] px-1 py-0.2 uppercase text-[#6b7280] font-mono">
            {active.type}
          </span>
          <PriorityBadge priority={active.priority} />
        </div>
        <button
          onClick={onClose}
          className="p-1 text-[#6b7280] hover:text-[#e5e7eb] transition-colors"
          title="Close (Esc)"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Title & Description */}
        <div>
          <h2 className="text-[13px] font-medium text-[#e5e7eb] mb-1 leading-snug font-sans">
            {active.title}
          </h2>
          <p className="text-[11px] text-[#6b7280] leading-relaxed font-sans border-l border-[#161a18] pl-2">
            {active.description || "No description provided."}
          </p>
        </div>

        {/* Key-Value Attributes Table */}
        <div className="divide-y divide-[#161a18] border-y border-[#161a18] py-0.5 text-[11px]">
          <div className="flex items-center justify-between py-1">
            <span className="text-[#9ca3af] uppercase font-semibold text-[11px]">STATUS</span>
            <select
              value={active.status}
              onChange={(e) => {
                const newStatus = e.target.value as WorkItemStatus;
                setLiveItem((prev) => (prev ? { ...prev, status: newStatus } : null));
                onUpdateStatus(active.id, newStatus);
              }}
              className="bg-[#080a09] text-emerald-400 font-bold border border-[#161a18] px-1.5 py-0.5 text-[11px] focus:outline-none cursor-pointer font-mono"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  ● {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#9ca3af] uppercase font-semibold text-[11px]">PRIORITY</span>
            <select
              value={active.priority}
              onChange={(e) => handlePriorityChange(e.target.value as WorkItemPriority)}
              className="bg-[#080a09] text-[#e5e7eb] font-bold border border-[#161a18] px-1.5 py-0.5 text-[11px] focus:outline-none cursor-pointer font-mono"
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#9ca3af] uppercase font-semibold text-[11px]">ASSIGNEE</span>
            <span className="text-[#e5e7eb] font-bold">{active.assigneeUserId ? `@${active.assigneeUserId}` : "Unassigned"}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#9ca3af] uppercase font-semibold text-[11px]">TEAM</span>
            <span className="text-[#e5e7eb]">{active.teamId || "Engineering"}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#9ca3af] uppercase font-semibold text-[11px]">PROJECT</span>
            <span className="text-[#6b7280]">{active.projectId || "None"}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-[#9ca3af] uppercase font-semibold text-[11px]">ESTIMATE</span>
            <span className="text-[#6b7280]">{active.estimate || "Unestimated"}</span>
          </div>
        </div>

        {/* ENGINEERING CONTEXT */}
        <div className="space-y-1">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">
            ENGINEERING CONTEXT
          </div>

          <div className="space-y-1.5 bg-[#080a09] p-2 border border-[#161a18] text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[#6b7280] flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-emerald-400" />
                <span>BRANCH</span>
              </span>
              <span className="text-emerald-400 font-bold font-mono">main</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#6b7280] flex items-center gap-1">
                <GitPullRequest className="w-3 h-3 text-[#6b7280]" />
                <span>PULL REQUEST</span>
              </span>
              <span className="text-[#6b7280] font-mono">None linked</span>
            </div>

            <div className="flex items-center justify-between text-[#6b7280]">
              <span>DEPLOYMENT</span>
              <span className="truncate max-w-[130px] text-emerald-400 font-bold font-mono">Active</span>
            </div>
          </div>
        </div>

        {/* ACTIVITY Feed */}
        <div className="space-y-1">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#9ca3af]">
            ACTIVITY
          </div>

          <div className="space-y-1.5 text-[11px] font-sans border-l border-[#161a18] pl-2">
            {history.length > 0 ? (
              history.map((h, i) => (
                <div key={i} className="flex justify-between items-start text-[#e5e7eb]">
                  <span>
                    <strong className="text-[#e5e7eb] font-mono">@{h.actor || "dev"}</strong> {h.action || "updated item"}
                  </span>
                  <span className="text-[10px] text-[#6b7280] font-mono">
                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : "just now"}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-[#6b7280] font-mono">No activity logged.</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Keyboard Hints */}
      <div className="p-1.5 border-t border-[#161a18] bg-[#050706] text-[10px] text-[#6b7280] flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span><kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">S</kbd> state</span>
          <span><kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">A</kbd> assign</span>
          <span><kbd className="px-1 py-0.2 bg-[#0e1310] border border-[#161a18] text-zinc-300">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
};
