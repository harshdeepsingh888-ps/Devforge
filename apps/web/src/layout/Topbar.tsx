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
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-[#161a18] bg-[#080a09] px-4 md:px-6">
      {/* LEFT: BREADCRUMB */}
      <div className="flex min-w-0 items-center gap-2 text-xs font-medium">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="mr-1.5 inline-flex h-7 w-7 items-center justify-center rounded border border-[#202622] text-[#9ca3af] hover:border-emerald-500/50 hover:text-white md:hidden"
            aria-label="Open sidebar"
          >
            ☰
          </button>
        )}

        <span className="truncate text-[#9ca3af]">
          {workspace.name}
        </span>

        <span className="text-[#3b4740] font-normal">/</span>

        <span className="truncate text-white font-semibold">
          {project.name}
        </span>

        <span className="text-[#3b4740] font-normal">/</span>

        <span className="truncate text-[#6b7280]">
          Work Stream
        </span>
      </div>

      {/* RIGHT: WORKSPACE ACTIONS */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onSwitchWorkspace}
          className="rounded border border-[#202622] bg-[#0b0f0d] px-2.5 py-1 text-xs font-medium text-[#9ca3af] transition hover:border-emerald-500/50 hover:text-white"
        >
          Switch workspace
        </button>
      </div>
    </header>
  );
};