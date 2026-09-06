import React, { useState } from "react";
import { api } from "../api/api";
import type { Project, Workspace } from "../types/api.types";

interface ProjectGateProps {
  workspace: Workspace;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onProjectCreated: (project: Project) => void;
}

export const ProjectGate: React.FC<ProjectGateProps> = ({
  workspace,
  projects,
  onSelectProject,
  onProjectCreated,
}) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const projectName = name.trim();
    if (!projectName || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const project = await api.createProject(workspace.id, projectName);
      setName("");
      onProjectCreated(project);
    } catch (err) {
      console.error("Failed to create project:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeProjects = projects.filter((p) => p.status !== "ARCHIVED");

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ffffff] p-6 text-[#0a0a0a] font-sans select-none">
      <section className="w-full max-w-lg space-y-6 rounded-2xl border border-[#d5d9e2] bg-[#f9f8f6] p-8 shadow-sm">
        <div>
          <span className="font-mono text-[10px] font-semibold text-[#858585] uppercase tracking-wider">
            Workspace: {workspace.name}
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#0a0a0a]">
            {activeProjects.length === 0 ? "Create Project" : "Select Project"}
          </h1>
          <p className="mt-1 text-xs text-[#858585]">
            {activeProjects.length === 0
              ? "Projects organize engineering work inside this workspace."
              : "Select a project to open its Work Stream."}
          </p>
        </div>

        {activeProjects.length > 0 && (
          <div className="space-y-2">
            {activeProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project)}
                className="flex w-full items-center justify-between rounded-xl border border-[#d5d9e2] bg-white px-4 py-3 text-left transition hover:border-[#0a0a0a] hover:bg-[#f2ede5]/40 shadow-xs"
              >
                <span className="font-semibold text-sm text-[#0a0a0a]">
                  {project.name}
                </span>
                <span className="font-mono text-xs text-[#858585]">Open &rarr;</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleCreate} className="border-t border-[#d5d9e2] pt-6 space-y-4">
          <div>
            <label
              htmlFor="project-name"
              className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#858585]"
            >
              {activeProjects.length === 0 ? "Project name *" : "Create another project"}
            </label>

            <input
              id="project-name"
              name="projectName"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Core Engine"
              autoComplete="off"
              autoFocus={projects.length === 0}
              disabled={isSubmitting}
              className="mt-1.5 w-full rounded-lg border border-[#d5d9e2] bg-white px-3.5 py-2 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]/10 font-sans"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-sans"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full rounded-full bg-[#0a0a0a] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Creating..." : "Create Project"}
          </button>
        </form>
      </section>
    </main>
  );
};