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
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[#d5d9e2] bg-[#f9f8f6] text-xs font-sans select-none">
      {/* BRAND & ACTIVE WORKSPACE */}
      <div className="border-b border-[#d5d9e2] p-4 bg-white">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold tracking-widest text-[#0a0a0a] text-xs">
            DEVFORGE
          </span>
          <span className="rounded-full bg-[#f9f8f6] px-2 py-0.5 text-[9px] font-mono font-bold text-[#737373] border border-[#d5d9e2]">
            CONTROL PLANE
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#858585]">
              Workspace
            </span>
            <span className="truncate font-bold text-[#0a0a0a] text-xs block">
              {workspace.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchWorkspace}
            className="shrink-0 font-sans text-[11px] font-medium text-[#737373] transition hover:text-[#0a0a0a] hover:underline underline-offset-2"
            title="Switch Workspace"
          >
            Switch
          </button>
        </div>
      </div>

      {/* CORE NAVIGATION */}
      <div className="p-3 border-b border-[#d5d9e2] space-y-1">
        <div className="flex items-center justify-between rounded-lg px-3 py-1.5 text-[#858585] opacity-50">
          <span className="font-medium text-xs font-mono">INBOX</span>
          <span className="text-[10px] font-bold font-mono">0</span>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-white border border-[#d5d9e2] px-3 py-2 font-bold text-[#0a0a0a] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a]" />
            <span className="text-xs">Work Stream</span>
          </div>
        </div>
      </div>

      {/* PROJECTS SECTION */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#858585]">
            Projects
          </span>
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreatingProject((prev) => !prev);
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#d5d9e2] bg-white text-[#0a0a0a] transition hover:border-[#0a0a0a] hover:bg-[#f2ede5] shadow-xs text-xs font-semibold"
            title="Create Project"
          >
            +
          </button>
        </div>

        {/* INLINE CREATE PROJECT FORM */}
        {isCreatingProject && (
          <form onSubmit={handleCreateProject} className="mb-3 space-y-2 rounded-xl border border-[#d5d9e2] bg-white p-3 shadow-xs">
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
              className="w-full rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1.5 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none focus:border-[#0a0a0a] focus:bg-white font-sans"
            />
            {createError && (
              <p className="text-[10px] font-medium text-rose-700">{createError}</p>
            )}
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingProject(false);
                  setNewProjectName("");
                  setCreateError(null);
                }}
                disabled={isSubmitting}
                className="px-2 py-1 text-[11px] font-medium text-[#737373] hover:text-[#0a0a0a]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newProjectName.trim()}
                className="rounded-full bg-[#0a0a0a] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#262626] disabled:opacity-40"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
            </div>
          </form>
        )}

        {/* PROJECT LIST */}
        {projects.length === 0 ? (
          <div className="px-1 py-4 text-center">
            <p className="text-xs text-[#737373]">No projects yet</p>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreatingProject(true);
              }}
              className="mt-2 text-xs font-semibold text-[#0a0a0a] underline underline-offset-4 hover:text-[#262626]"
            >
              Create project
            </button>
          </div>
        ) : (
          <nav className="space-y-1">
            {projects.map((project) => {
              const isActive = project.id === activeProject.id;

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onSelectProject(project)}
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition",
                    isActive
                      ? "bg-white font-bold text-[#0a0a0a] border border-[#d5d9e2] shadow-xs"
                      : "text-[#737373] hover:bg-[#f2ede5]/70 hover:text-[#0a0a0a] font-medium",
                  ].join(" ")}
                >
                  <span className="block truncate font-sans">{project.name}</span>
                  {isActive && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#d5d9e2] p-3.5 bg-white font-mono text-[10px] text-[#858585] flex items-center justify-between">
        <span>DevForge Control Plane</span>
        <span>v0.1</span>
      </div>
    </aside>
  );
};