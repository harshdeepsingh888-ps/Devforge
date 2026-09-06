import React from "react";
import type { Project, Workspace } from "../types/api.types";

interface TopbarProps {
  workspace: Workspace;
  project: Project;
  onSwitchWorkspace: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  workspace,
  project,
  onSwitchWorkspace,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-[#d5d9e2] bg-white px-4 md:px-6">
      {/* LEFT: BREADCRUMB */}
      <div className="flex min-w-0 items-center gap-2 text-xs font-sans">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] md:hidden shadow-xs"
            aria-label="Open sidebar"
          >
            ☰
          </button>
        )}

        <span className="truncate font-medium text-[#737373]">
          {workspace.name}
        </span>

        <span className="text-[#d5d9e2] font-light">/</span>

        <span className="truncate font-bold text-[#0a0a0a]">
          {project.name}
        </span>

        <span className="text-[#d5d9e2] font-light">/</span>

        <span className="rounded-full border border-[#d5d9e2] bg-[#f9f8f6] px-2 py-0.5 text-[10px] font-mono font-medium text-[#737373]">
          WORK STREAM
        </span>
      </div>

      {/* RIGHT: WORKSPACE ACTIONS */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onSwitchWorkspace}
          className="rounded-full border border-[#d5d9e2] bg-white px-3.5 py-1 text-xs font-medium text-[#0a0a0a] transition hover:border-[#0a0a0a] hover:bg-[#f9f8f6] shadow-xs"
        >
          Switch workspace
        </button>
      </div>
    </header>
  );
};