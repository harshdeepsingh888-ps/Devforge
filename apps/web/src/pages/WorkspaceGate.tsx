import React, { useState } from "react";
import { api } from "../api/api";
import type { Workspace } from "../types/api.types";

interface WorkspaceGateProps {
  workspaces: Workspace[];
  onSelectWorkspace: (workspace: Workspace) => void;
  onWorkspaceCreated: (workspace: Workspace) => void;
}

export const WorkspaceGate: React.FC<WorkspaceGateProps> = ({
  workspaces,
  onSelectWorkspace,
  onWorkspaceCreated,
}) => {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const workspaceName = name.trim();
    if (!workspaceName || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const workspace = await api.createWorkspace(workspaceName);
      setName("");
      onWorkspaceCreated(workspace);
    } catch (err) {
      console.error("Failed to create workspace:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
   * ZERO WORKSPACES: CREATE WORKSPACE
   */
  if (workspaces.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#ffffff] p-6 text-[#0a0a0a] font-sans select-none">
        <section className="w-full max-w-md space-y-6 rounded-2xl border border-[#d5d9e2] bg-[#f9f8f6] p-8 shadow-sm">
          <div>
            <div className="text-[10px] font-sans font-bold tracking-widest text-[#858585] uppercase">
              DEVFORGE
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0a0a0a]">
              Create Workspace
            </h1>
            <p className="mt-1 text-xs text-[#858585]">
              Create your first workspace to start using DevForge.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="workspace-name"
                className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#858585]"
              >
                Workspace name *
              </label>

              <input
                id="workspace-name"
                name="workspaceName"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Acme Engineering"
                autoComplete="off"
                autoFocus
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
              {isSubmitting ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  /*
   * WORKSPACES EXIST: SELECT WORKSPACE
   */
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#ffffff] p-6 text-[#0a0a0a] font-sans select-none">
      <section className="w-full max-w-lg space-y-6 rounded-2xl border border-[#d5d9e2] bg-[#f9f8f6] p-8 shadow-sm">
        <div>
          <div className="text-[10px] font-sans font-bold tracking-widest text-[#858585] uppercase">
            DEVFORGE
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0a0a0a]">
            Select Workspace
          </h1>
          <p className="mt-1 text-xs text-[#858585]">
            Choose the workspace you want to open.
          </p>
        </div>

        <div className="space-y-2">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => onSelectWorkspace(workspace)}
              className="flex w-full items-center justify-between rounded-xl border border-[#d5d9e2] bg-white px-4 py-3 text-left transition hover:border-[#0a0a0a] hover:bg-[#f2ede5]/40 shadow-xs"
            >
              <span className="font-semibold text-sm text-[#0a0a0a]">
                {workspace.name}
              </span>
              <span className="font-mono text-xs text-[#858585]">Open &rarr;</span>
            </button>
          ))}
        </div>

        <div className="border-t border-[#d5d9e2] pt-6">
          <h2 className="text-xs font-semibold text-[#0a0a0a] font-mono uppercase tracking-wider">
            Create another workspace
          </h2>

          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Workspace name"
              autoComplete="off"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#d5d9e2] bg-white px-3.5 py-2 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]/10 font-sans"
            />

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
              className="rounded-full bg-[#0a0a0a] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};