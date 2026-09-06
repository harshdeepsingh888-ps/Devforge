import React, { useEffect, useRef, useState } from "react";
import { api } from "../api/api";
import type { Project, Workspace } from "../types/api.types";

interface SidebarProps {
  workspace: Workspace;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (project: Project) => void;
  onProjectCreated: (project: Project) => void;
  onProjectUpdated: (project: Project) => void;
  onProjectDeleted: (projectId: string) => void;
  onSwitchWorkspace: () => void;
}

const PINNED_STORAGE_KEY_PREFIX = "devforge_pinned_";

function getStoredPinnedIds(workspaceId: string): string[] {
  try {
    const raw = localStorage.getItem(`${PINNED_STORAGE_KEY_PREFIX}${workspaceId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storePinnedIds(workspaceId: string, ids: string[]): void {
  try {
    localStorage.setItem(
      `${PINNED_STORAGE_KEY_PREFIX}${workspaceId}`,
      JSON.stringify(ids),
    );
  } catch (err) {
    console.error("Failed to save pinned projects:", err);
  }
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspace,
  projects,
  activeProject,
  onSelectProject,
  onProjectCreated,
  onProjectUpdated,
  onProjectDeleted,
  onSwitchWorkspace,
}) => {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Pin state per workspace
  const [pinnedIds, setPinnedIds] = useState<string[]>(() =>
    getStoredPinnedIds(workspace.id),
  );

  // Archived section toggle
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

  // Action menu state
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Deletion modal state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync pinned IDs when workspace changes or clean up stale IDs
  useEffect(() => {
    const stored = getStoredPinnedIds(workspace.id);
    const validIds = stored.filter((id) =>
      projects.some((p) => p.id === id),
    );
    setPinnedIds(validIds);
    if (validIds.length !== stored.length) {
      storePinnedIds(workspace.id, validIds);
    }
  }, [workspace.id, projects]);

  // Close project action menu on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuProjectId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuProjectId(null);
        if (!isDeleting) {
          setProjectToDelete(null);
        }
      }
    };

    if (openMenuProjectId || projectToDelete) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuProjectId, projectToDelete, isDeleting]);

  const handleTogglePin = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuProjectId(null);

    setPinnedIds((prev) => {
      const next = prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId];
      storePinnedIds(workspace.id, next);
      return next;
    });
  };

  const handleArchiveProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuProjectId(null);

    try {
      const updated = await api.archiveProject(workspace.id, project.id);
      onProjectUpdated(updated);
    } catch (err) {
      console.error("Failed to archive project:", err);
    }
  };

  const handleRestoreProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuProjectId(null);

    try {
      const updated = await api.restoreProject(workspace.id, project.id);
      onProjectUpdated(updated);
    } catch (err) {
      console.error("Failed to restore project:", err);
    }
  };

  const handleOpenDeleteModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuProjectId(null);
    setDeleteError(null);
    setProjectToDelete(project);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete || isDeleting) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.deleteProject(workspace.id, projectToDelete.id);

      // Clean up pinned state if pinned
      setPinnedIds((prev) => {
        const next = prev.filter((id) => id !== projectToDelete.id);
        storePinnedIds(workspace.id, next);
        return next;
      });

      const deletedId = projectToDelete.id;
      setProjectToDelete(null);
      onProjectDeleted(deletedId);
    } catch (err) {
      console.error("Failed to delete project:", err);
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete project.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Partition projects into active and archived
  const activeProjects = projects.filter((p) => p.status !== "ARCHIVED");
  const archivedProjects = projects.filter((p) => p.status === "ARCHIVED");

  // Sort active projects: pinned first
  const pinnedActiveProjects = activeProjects.filter((p) =>
    pinnedIds.includes(p.id),
  );
  const unpinnedActiveProjects = activeProjects.filter(
    (p) => !pinnedIds.includes(p.id),
  );
  const sortedActiveProjects = [
    ...pinnedActiveProjects,
    ...unpinnedActiveProjects,
  ];

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[#d5d9e2] dark:border-white/[0.06] bg-[#f9f8f6] dark:bg-[#111110] text-xs font-sans select-none">
      {/* BRAND & ACTIVE WORKSPACE */}
      <div className="border-b border-[#d5d9e2] dark:border-white/[0.06] p-4 bg-white dark:bg-[#111110] shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-sans font-black tracking-widest text-[#0a0a0a] dark:text-white text-sm">
            DEVFORGE
          </span>
          <span className="text-[10px] font-sans font-normal text-[#858585] dark:text-[#6e6b66] tracking-wide">
            Control Plane
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="block text-[9px] font-sans font-medium uppercase tracking-widest text-[#858585] dark:text-[#6e6b66]">
              Workspace
            </span>
            <span className="truncate font-bold text-[#0a0a0a] dark:text-white text-xs block">
              {workspace.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchWorkspace}
            className="shrink-0 font-sans text-[11px] font-medium text-[#737373] dark:text-[#88857f] transition duration-150 hover:text-[#0a0a0a] dark:hover:text-white hover:underline underline-offset-2"
            title="Switch Workspace"
          >
            Switch
          </button>
        </div>
      </div>

      {/* CORE NAVIGATION */}
      <div className="p-3 border-b border-[#d5d9e2] dark:border-white/[0.06] space-y-1 shrink-0">
        <span className="px-1 text-[9px] font-sans font-semibold uppercase tracking-widest text-[#858585] dark:text-[#6e6b66] block mb-1">
          Navigation
        </span>

        <div className="flex items-center justify-between rounded-lg bg-[#f2ede5] dark:bg-[#161514] px-2.5 py-1.5 font-semibold text-[#0a0a0a] dark:text-white transition duration-150">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] dark:bg-[#f2ede5]" />
            <span className="text-xs font-sans">Work Stream</span>
          </div>
        </div>
      </div>

      {/* PROJECTS SECTION */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-[#858585]">
              Projects
            </span>
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreatingProject((prev) => !prev);
              }}
              className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-[#d5d9e2] bg-white text-[#0a0a0a] transition duration-150 hover:border-[#0a0a0a] hover:bg-[#f2ede5] shadow-xs text-xs font-semibold"
              title="Create Project"
            >
              +
            </button>
          </div>

          {/* INLINE CREATE PROJECT FORM */}
          {isCreatingProject && (
            <form
              onSubmit={handleCreateProject}
              className="mb-3 space-y-2 rounded-xl border border-[#d5d9e2] bg-white p-3 shadow-xs"
            >
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
                className="w-full rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1.5 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none focus:border-[#0a0a0a] focus:bg-white font-sans transition duration-150"
              />
              {createError && (
                <p className="text-[10px] font-medium text-rose-700">
                  {createError}
                </p>
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
                  className="px-2 py-1 text-[11px] font-medium text-[#737373] hover:text-[#0a0a0a] transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newProjectName.trim()}
                  className="rounded-lg bg-[#0a0a0a] px-3.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-[#262626] disabled:opacity-40 transition duration-150"
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          )}

          {/* ACTIVE PROJECT LIST */}
          {activeProjects.length === 0 ? (
            <div className="px-1 py-4 text-center">
              <p className="text-xs text-[#737373]">No active projects</p>
              <button
                type="button"
                onClick={() => {
                  setCreateError(null);
                  setIsCreatingProject(true);
                }}
                className="mt-2 text-xs font-semibold text-[#0a0a0a] underline underline-offset-4 hover:text-[#262626] transition duration-150"
              >
                Create project
              </button>
            </div>
          ) : (
            <nav className="space-y-0.5">
              {sortedActiveProjects.map((project) => {
                const isActive = activeProject?.id === project.id;
                const isPinned = pinnedIds.includes(project.id);
                const isMenuOpen = openMenuProjectId === project.id;

                return (
                  <div
                    key={project.id}
                    className={[
                      "group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition duration-150",
                      isActive
                        ? "bg-[#f2ede5] dark:bg-[#161514] font-semibold text-[#0a0a0a] dark:text-white"
                        : "text-[#737373] dark:text-[#9e9a93] hover:bg-[#f2ede5]/40 dark:hover:bg-[#141312] hover:text-[#0a0a0a] dark:hover:text-white font-normal",
                    ].join(" ")}
                  >
                    {/* PROJECT CLICK TARGET */}
                    <button
                      type="button"
                      onClick={() => onSelectProject(project)}
                      className="flex flex-1 min-w-0 items-center gap-1.5 text-left py-0.5"
                    >
                      {/* PIN ICON */}
                      {isPinned && (
                        <span
                          className="shrink-0 text-[10px] text-[#858585] dark:text-[#6e6b66] font-mono"
                          title="Pinned project"
                        >
                          📌
                        </span>
                      )}
                      <span className="block truncate font-sans">
                        {project.name}
                      </span>
                    </button>

                    {/* ACTIONS & ACTIVE INDICATOR */}
                    <div className="flex shrink-0 items-center gap-1 ml-1.5">
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] dark:bg-[#f2ede5] shrink-0" />
                      )}

                      {/* ACTION MENU TRIGGER */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProjectId((prev) =>
                            prev === project.id ? null : project.id,
                          );
                        }}
                        aria-label={`Actions for ${project.name}`}
                        className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-mono text-[#858585] transition hover:bg-[#d5d9e2]/50 hover:text-[#0a0a0a]",
                          isMenuOpen
                            ? "opacity-100 bg-[#d5d9e2]/50 text-[#0a0a0a]"
                            : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                        ].join(" ")}
                        title="Project actions"
                      >
                        ···
                      </button>
                    </div>

                    {/* PROJECT ACTION DROPDOWN */}
                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-[#d5d9e2] bg-white p-1.5 shadow-xl font-sans text-xs animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(project.id, e)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#0a0a0a] font-medium transition hover:bg-[#f2ede5]"
                        >
                          <span className="text-[11px]">
                            {isPinned ? "✕" : "📌"}
                          </span>
                          <span>{isPinned ? "Unpin project" : "Pin project"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleArchiveProject(project, e)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#0a0a0a] font-medium transition hover:bg-[#f2ede5]"
                        >
                          <span className="text-[11px]">📦</span>
                          <span>Archive project</span>
                        </button>

                        <div className="my-1 border-t border-[#d5d9e2]" />

                        <button
                          type="button"
                          onClick={(e) => handleOpenDeleteModal(project, e)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-rose-600 font-medium transition hover:bg-rose-50 hover:text-rose-700"
                        >
                          <span className="text-[11px]">🗑</span>
                          <span>Delete project...</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* ARCHIVED SECTION */}
        {archivedProjects.length > 0 && (
          <div className="border-t border-[#d5d9e2] pt-2">
            <button
              type="button"
              onClick={() => setIsArchivedExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between px-1 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#858585] hover:text-[#0a0a0a] transition"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[9px]">
                  {isArchivedExpanded ? "▼" : "▶"}
                </span>
                <span>Archived</span>
              </div>
              <span className="rounded-full bg-[#f2ede5] px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#737373] border border-[#d5d9e2]">
                {archivedProjects.length}
              </span>
            </button>

            {isArchivedExpanded && (
              <div className="mt-1 space-y-0.5">
                {archivedProjects.map((project) => {
                  const isActive = activeProject?.id === project.id;
                  const isMenuOpen = openMenuProjectId === project.id;

                  return (
                    <div
                      key={project.id}
                      className={[
                        "group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition duration-150",
                        isActive
                          ? "bg-[#f2ede5] dark:bg-[#252422] font-semibold text-[#0a0a0a]"
                          : "text-[#858585] hover:bg-[#f2ede5]/50 dark:hover:bg-[#1c1b1a] hover:text-[#0a0a0a] font-normal",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProject(project)}
                        className="flex flex-1 min-w-0 items-center gap-1.5 text-left py-0.5"
                      >
                        <span className="block truncate font-sans">
                          {project.name}
                        </span>
                        <span className="shrink-0 rounded bg-[#f2ede5] px-1.5 py-0.5 text-[8px] font-mono font-semibold text-[#858585] uppercase">
                          Archived
                        </span>
                      </button>

                      {/* ACTIONS & ACTIVE INDICATOR */}
                      <div className="flex shrink-0 items-center gap-1 ml-1.5">
                        {isActive && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[#858585] shrink-0" />
                        )}

                        {/* ACTION MENU TRIGGER */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuProjectId((prev) =>
                              prev === project.id ? null : project.id,
                            );
                          }}
                          aria-label={`Actions for ${project.name}`}
                          className={[
                            "inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-mono text-[#858585] transition hover:bg-[#d5d9e2]/50 hover:text-[#0a0a0a]",
                            isMenuOpen
                              ? "opacity-100 bg-[#d5d9e2]/50 text-[#0a0a0a]"
                              : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                          ].join(" ")}
                          title="Project actions"
                        >
                          ···
                        </button>
                      </div>

                      {/* ARCHIVED PROJECT ACTION DROPDOWN */}
                      {isMenuOpen && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-[#d5d9e2] bg-white p-1.5 shadow-xl font-sans text-xs animate-in fade-in zoom-in-95 duration-100"
                        >
                          <button
                            type="button"
                            onClick={(e) => handleRestoreProject(project, e)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[#0a0a0a] font-medium transition hover:bg-[#f2ede5]"
                          >
                            <span className="text-[11px]">↩</span>
                            <span>Restore project</span>
                          </button>

                          <div className="my-1 border-t border-[#d5d9e2]" />

                          <button
                            type="button"
                            onClick={(e) => handleOpenDeleteModal(project, e)}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-rose-600 font-medium transition hover:bg-rose-50 hover:text-rose-700"
                          >
                            <span className="text-[11px]">🗑</span>
                            <span>Delete project...</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-[#d5d9e2] p-3.5 bg-white font-mono text-[10px] text-[#858585] flex items-center justify-between shrink-0">
        <span>DevForge Control Plane</span>
        <span>v0.1</span>
      </div>

      {/* DESTRUCTIVE DELETION CONFIRMATION MODAL */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#d5d9e2] bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-lg">
                🗑
              </div>
              <div>
                <h3 className="font-sans font-bold text-[#0a0a0a] text-sm">
                  Delete Project
                </h3>
                <p className="font-sans text-xs text-[#737373]">
                  Permanent, destructive action
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-[#0a0a0a] font-sans">
              <p>
                Are you sure you want to permanently delete{" "}
                <strong className="font-semibold text-[#0a0a0a]">
                  {projectToDelete.name}
                </strong>
                ?
              </p>

              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-rose-900 text-[11px] leading-relaxed">
                <strong>Warning:</strong> All work items, workflows, technical
                specifications, and pipelines associated with this project will
                be permanently deleted. This action cannot be undone.
              </div>

              {deleteError && (
                <div className="rounded-lg border border-rose-300 bg-rose-100 p-2.5 text-rose-800 text-[11px] font-medium">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#d5d9e2]">
              <button
                type="button"
                onClick={() => {
                  if (!isDeleting) setProjectToDelete(null);
                }}
                disabled={isDeleting}
                className="rounded-full border border-[#d5d9e2] bg-white px-4 py-1.5 font-medium text-[#737373] transition hover:bg-[#f9f8f6] hover:text-[#0a0a0a] disabled:opacity-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-full bg-rose-600 px-4 py-1.5 font-semibold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50 text-xs"
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};