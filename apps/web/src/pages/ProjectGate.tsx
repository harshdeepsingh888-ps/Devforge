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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050706] p-6 text-[#e5e7eb] font-sans">
      <section className="w-full max-w-lg space-y-6 rounded-md border border-[#202622] bg-[#080a09] p-8 shadow-2xl">
        <div>
          <span className="font-mono text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">
            Workspace: {workspace.name}
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            {projects.length === 0 ? "Create Project" : "Select Project"}
          </h1>
          <p className="mt-1 text-xs text-[#9ca3af]">
            {projects.length === 0
              ? "Projects organize engineering work inside this workspace."
              : "Select a project to open its Work Stream."}
          </p>
        </div>

        {projects.length > 0 && (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => onSelectProject(project)}
                className="flex w-full items-center justify-between rounded border border-[#202622] bg-[#0b0f0d] px-4 py-3 text-left transition hover:border-emerald-500/50 hover:bg-[#101512]"
              >
                <span className="font-semibold text-sm text-white">
                  {project.name}
                </span>
                <span className="font-mono text-xs text-emerald-400">Open &rarr;</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleCreate} className="border-t border-[#161a18] pt-6 space-y-4">
          <div>
            <label
              htmlFor="project-name"
              className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8d99a8]"
            >
              {projects.length === 0 ? "Project name *" : "Create another project"}
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
              className="mt-1.5 w-full rounded border border-[#202622] bg-[#050706] px-3.5 py-2 text-xs text-white placeholder:text-[#525d6b] outline-none transition focus:border-emerald-400 font-mono"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full rounded bg-emerald-400 px-4 py-2 font-mono text-xs font-bold text-[#07110d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Creating..." : "Create Project"}
          </button>
        </form>
      </section>
    </main>
  );
};