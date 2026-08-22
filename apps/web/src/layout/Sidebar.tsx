import React, { useState } from "react";
import { api } from "../api/api";
import type { Project, Workspace } from "../types/api.types";

interface SidebarProps {
  workspace: Workspace;
  projects: Project[];
  activeProject: Project;
  onSelectProject: (project: Project) => void;
  onProjectCreated: (project: Project) => void;
  onSwitchWorkspace: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  projects,
  activeProject,
  onSelectProject,
  onProjectCreated,
  onSwitchWorkspace,
}) => {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateProject = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const name = newProjectName.trim();
    if (!name || isSubmitting) return;

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const created = await api.createProject(workspace.id, name);
      setNewProjectName("");
      setIsCreatingProject(false);
      onProjectCreated(created);
    } catch (err) {
      console.error("Failed to create project from sidebar:", err);
      setCreateError(
        err instanceof Error ? err.message : "Failed to create project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-[#161a18] bg-[#050706] text-xs font-mono select-none">
      {/* BRAND & ACTIVE WORKSPACE */}
      <div className="border-b border-[#161a18] p-4">
        <div className="flex items-center justify-between">
          <span className="font-bold tracking-widest text-emerald-400 text-[11px]">
            DEVFORGE
          </span>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 border border-emerald-500/20">
            PROD
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-white text-xs font-sans">
            {workspace.name}
          </span>
          <button
            type="button"
            onClick={onSwitchWorkspace}
            className="shrink-0 text-[10px] text-[#6b7280] transition hover:text-emerald-400"
            title="Switch Workspace"
          >
            Switch
          </button>
        </div>
      </div>

      {/* CORE NAVIGATION */}
      <div className="p-3 border-b border-[#161a18] space-y-1">
        <div className="flex items-center justify-between rounded px-2.5 py-1.5 text-[#6b7280] opacity-60">
          <span className="font-medium text-xs">INBOX</span>
          <span className="text-[10px] font-bold">0</span>
        </div>

        <div className="flex items-center justify-between rounded border-l-2 border-emerald-400 bg-[#064e3b]/20 px-2.5 py-1.5 font-semibold text-emerald-300">
          <span className="text-xs">Work Stream</span>
        </div>
      </div>

      {/* PROJECTS SECTION */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
            Projects
          </span>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreatingProject((prev) => !prev);
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded border border-[#202622] text-[#9ca3af] transition hover:border-emerald-500/50 hover:text-white"
            title="Create Project"
          >
            +
          </button>
        </div>

        {/* INLINE CREATE PROJECT FORM */}
        {isCreatingProject && (
          <form onSubmit={handleCreateProject} className="mb-3 space-y-2 rounded border border-[#202622] bg-[#080a09] p-2">
            <input
              type="text"
              autoFocus
              value={newProjectName}
              onChange={(e) => {
                setNewProjectName(e.target.value);
                if (createError) setCreateError(null);
              }}
              placeholder="Project name..."
              disabled={isSubmitting}
              className="w-full rounded border border-[#202622] bg-[#050706] px-2 py-1 text-xs text-white placeholder:text-[#525d6b] outline-none focus:border-emerald-500"
            />
            {createError && (
              <p className="text-[10px] text-rose-400">{createError}</p>
            )}
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingProject(false);
                  setNewProjectName("");
                  setCreateError(null);
                }}
                disabled={isSubmitting}
                className="px-2 py-1 text-[10px] text-[#9ca3af] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newProjectName.trim()}
                className="rounded bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        )}

        {/* PROJECT LIST */}
        {projects.length === 0 ? (
          <div className="px-1 py-3 text-center">
            <p className="text-[11px] text-[#6b7280]">No projects yet</p>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreatingProject(true);
              }}
              className="mt-2 text-xs font-medium text-emerald-400 underline underline-offset-4 hover:text-emerald-300"
            >
              Create project
            </button>
          </div>
        ) : (
          <nav className="space-y-0.5">
            {projects.map((project) => {
              const isActive = project.id === activeProject.id;

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project)}
                  className={[
                    "flex w-full items-center rounded px-2.5 py-1.5 text-left text-xs transition",
                    isActive
                      ? "border-l-2 border-emerald-400 bg-[#064e3b]/20 font-medium text-emerald-300"
                      : "text-[#9ca3af] hover:bg-[#101512] hover:text-white",
                  ].join(" ")}
                >
                  <span className="block truncate">{project.name}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#161a18] p-3 text-[10px] text-[#6b7280]">
        <span>Control Plane v0.1</span>
      </div>
    </aside>
  );
};