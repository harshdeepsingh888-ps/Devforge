import React, { useEffect, useRef, useState } from "react";
import type { Project, Workspace } from "../types/api.types";
import { useTheme } from "../context/ThemeContext";

interface TopbarProps {
  workspace: Workspace;
  project: Project;
  projects?: Project[];
  onSelectProject?: (project: Project) => void;
  onSwitchWorkspace: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  workspace,
  project,
  projects = [],
  onSelectProject,
  onSwitchWorkspace,
  onToggleMobileSidebar,
}) => {
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const { mode, resolvedTheme, setMode } = useTheme();

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(e.target as Node)
      ) {
        setIsProjectMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProjectMenuOpen(false);
      }
    };

    if (isProjectMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProjectMenuOpen]);

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between border-b border-[#d5d9e2] dark:border-white/[0.06] bg-white dark:bg-[#111110] px-4 md:px-6 select-none">
      {/* LEFT: BREADCRUMB HIERARCHY */}
      <div className="flex min-w-0 items-center gap-1.5 text-xs font-sans">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="mr-1 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#d5d9e2] dark:border-white/10 bg-[#f9f8f6] dark:bg-[#161514] text-[#0a0a0a] dark:text-white hover:bg-[#f2ede5] dark:hover:bg-[#1a1918] md:hidden shadow-xs transition duration-150"
            aria-label="Open sidebar"
          >
            ☰
          </button>
        )}

        {/* WORKSPACE BREADCRUMB BUTTON */}
        <button
          type="button"
          onClick={onSwitchWorkspace}
          className="rounded-md px-1.5 py-0.5 font-medium text-[#737373] dark:text-[#88857f] transition duration-150 hover:bg-[#f2ede5] dark:hover:bg-[#161514] hover:text-[#0a0a0a] dark:hover:text-white"
          title={`Switch workspace (${workspace.name})`}
        >
          <span className="truncate max-w-[140px] sm:max-w-[200px] block">
            {workspace.name}
          </span>
        </button>

        <span className="text-[#858585]/40 dark:text-white/20 font-mono text-xs">/</span>

        {/* PROJECT BREADCRUMB / DROPDOWN SELECTOR */}
        <div className="relative" ref={projectMenuRef}>
          <button
            type="button"
            onClick={() => setIsProjectMenuOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={isProjectMenuOpen}
            className="group flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold text-[#0a0a0a] dark:text-white transition duration-150 hover:bg-[#f2ede5] dark:hover:bg-[#161514]"
            title="Switch project"
          >
            <span className="truncate max-w-[140px] sm:max-w-[200px] block">
              {project.name}
            </span>
            {projects.length > 1 && (
              <span className="text-[9px] text-[#858585] dark:text-[#78756f] group-hover:text-[#0a0a0a] dark:group-hover:text-white font-mono">
                ▾
              </span>
            )}
          </button>

          {/* PROJECT SWITCHER DROPDOWN */}
          {isProjectMenuOpen && projects.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-[#d5d9e2] dark:border-white/[0.08] bg-white dark:bg-[#1a1918] p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2.5 py-1 text-[9px] font-sans font-semibold uppercase tracking-widest text-[#858585] dark:text-[#6e6b66] border-b border-[#f2ede5] dark:border-white/[0.06]">
                Switch Project
              </div>
              <div className="mt-1 space-y-0.5 max-h-56 overflow-y-auto">
                {projects.map((p) => {
                  const isActive = p.id === project.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (onSelectProject) onSelectProject(p);
                        setIsProjectMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition duration-150 ${
                        isActive
                          ? "bg-[#f2ede5] dark:bg-[#232220] font-semibold text-[#0a0a0a] dark:text-white"
                          : "text-[#525252] dark:text-[#9e9a93] hover:bg-[#f9f8f6] dark:hover:bg-[#141312] hover:text-[#0a0a0a] dark:hover:text-white font-normal"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] dark:bg-[#f2ede5] shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <span className="text-[#858585]/40 dark:text-white/20 font-mono text-xs">/</span>

        {/* WORK STREAM CONTEXT LABEL */}
        <span className="text-xs font-medium text-[#737373] dark:text-[#88857f]">
          Work Stream
        </span>
      </div>

      {/* RIGHT: THEME CONTROL & WORKSPACE ACTIONS */}
      <div className="flex shrink-0 items-center gap-2.5">
        {/* COMPACT THEME MODE CONTROL */}
        <div
          className="inline-flex items-center rounded-lg bg-[#ebe6dc] dark:bg-[#161514] border border-[#d5d9e2]/50 dark:border-white/[0.04] p-0.5 font-sans text-[11px]"
          role="radiogroup"
          aria-label="Theme mode"
        >
          <button
            type="button"
            onClick={() => setMode("AUTO")}
            role="radio"
            aria-checked={mode === "AUTO"}
            title={`Auto mode (currently ${resolvedTheme})`}
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition duration-150 ${
              mode === "AUTO"
                ? "bg-white dark:bg-[#232220] text-[#0a0a0a] dark:text-white font-semibold shadow-2xs"
                : "text-[#737373] dark:text-[#78756f] hover:text-[#0a0a0a] dark:hover:text-white"
            }`}
          >
            <span>Auto</span>
            {mode === "AUTO" && (
              <span className="h-1 w-1 rounded-full bg-current" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMode("LIGHT")}
            role="radio"
            aria-checked={mode === "LIGHT"}
            title="Light mode"
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition duration-150 ${
              mode === "LIGHT"
                ? "bg-white dark:bg-[#232220] text-[#0a0a0a] dark:text-white font-semibold shadow-2xs"
                : "text-[#737373] dark:text-[#78756f] hover:text-[#0a0a0a] dark:hover:text-white"
            }`}
          >
            <span>☀️</span>
            <span className="hidden sm:inline">Light</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("DARK")}
            role="radio"
            aria-checked={mode === "DARK"}
            title="Dark mode"
            className={`flex items-center gap-1 rounded-md px-2 py-0.5 transition duration-150 ${
              mode === "DARK"
                ? "bg-white dark:bg-[#232220] text-[#0a0a0a] dark:text-white font-semibold shadow-2xs"
                : "text-[#737373] dark:text-[#78756f] hover:text-[#0a0a0a] dark:hover:text-white"
            }`}
          >
            <span>🌙</span>
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onSwitchWorkspace}
          className="rounded-lg border border-[#d5d9e2] dark:border-white/[0.08] bg-white dark:bg-[#161514] px-3 py-1 text-xs font-medium text-[#0a0a0a] dark:text-[#9e9a93] transition duration-150 hover:border-[#0a0a0a] dark:hover:border-white/20 hover:bg-[#f2ede5] dark:hover:bg-[#1a1918] hover:text-[#0a0a0a] dark:hover:text-white shadow-xs"
        >
          Switch workspace
        </button>
      </div>
    </header>
  );
};