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
      <main className="flex min-h-screen items-center justify-center bg-[#050706] p-6 text-[#e5e7eb] font-sans">
        <section className="w-full max-w-md space-y-6 rounded-md border border-[#202622] bg-[#080a09] p-8 shadow-2xl">
          <div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
              DEVFORGE
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
              Create Workspace
            </h1>
            <p className="mt-1 text-xs text-[#9ca3af]">
              Create your first workspace to start using DevForge.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="workspace-name"
                className="block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8d99a8]"
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
    <main className="flex min-h-screen items-center justify-center bg-[#050706] p-6 text-[#e5e7eb] font-sans">
      <section className="w-full max-w-lg space-y-6 rounded-md border border-[#202622] bg-[#080a09] p-8 shadow-2xl">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
            DEVFORGE
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Select Workspace
          </h1>
          <p className="mt-1 text-xs text-[#9ca3af]">
            Choose the workspace you want to open.
          </p>
        </div>

        <div className="space-y-2">
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              onClick={() => onSelectWorkspace(workspace)}
              className="flex w-full items-center justify-between rounded border border-[#202622] bg-[#0b0f0d] px-4 py-3 text-left transition hover:border-emerald-500/50 hover:bg-[#101512]"
            >
              <span className="font-semibold text-sm text-white">
                {workspace.name}
              </span>
              <span className="font-mono text-xs text-emerald-400">Open &rarr;</span>
            </button>
          ))}
        </div>

        <div className="border-t border-[#161a18] pt-6">
          <h2 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
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
              className="w-full rounded border border-[#202622] bg-[#050706] px-3.5 py-2 text-xs text-white placeholder:text-[#525d6b] outline-none transition focus:border-emerald-400 font-mono"
            />

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
              className="rounded bg-emerald-400 px-4 py-2 font-mono text-xs font-bold text-[#07110d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? "Creating..." : "Create Workspace"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};