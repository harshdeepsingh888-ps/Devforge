import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useKeyboard } from "../../context/KeyboardContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import { apiService } from "../../services/api.service";
import type { WorkItemPriority, WorkItemType } from "../../types/api.types";

interface CreateWorkItemModalProps {
  onSuccess: () => void;
}

export const CreateWorkItemModal: React.FC<CreateWorkItemModalProps> = ({
  onSuccess,
}) => {
  const { isCreateModalOpen, setCreateModalOpen } = useKeyboard();
  const { activeWorkspace, projects, activeProject } = useWorkspace();

  const [projectId, setProjectId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkItemType>("TASK");
  const [priority, setPriority] = useState<WorkItemPriority>("P1");
  const [estimate, setEstimate] = useState("2d");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync projectId whenever activeProject, projects list or modal open state changes
  useEffect(() => {
    if (activeProject?.id) {
      setProjectId(activeProject.id);
    } else if (projects.length > 0) {
      setProjectId(projects[0].id);
    } else {
      setProjectId("proj-1");
    }
  }, [activeProject?.id, projects, isCreateModalOpen]);

  if (!isCreateModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetWsId = activeWorkspace?.id || "ws-acme-core";
    const targetProjectId =
      projectId || activeProject?.id || (projects[0]?.id) || "proj-1";

    if (!title.trim()) {
      setError("Please enter a title for the work item.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await apiService.createWorkItem(targetWsId, {
        projectId: targetProjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        priority,
        estimate,
      });
      setTitle("");
      setDescription("");
      setCreateModalOpen(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create work item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4 font-mono"
      onClick={() => setCreateModalOpen(false)}
    >
      <div
        className="w-full max-w-md bg-[#0d0f0f] border border-[#1c201e] rounded-sm shadow-2xl overflow-hidden flex flex-col relative before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500/30 before:to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1c201e] bg-[#090a0a]">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>CREATE WORK ITEM (C)</span>
          </div>
          <button
            onClick={() => setCreateModalOpen(false)}
            className="p-1 text-zinc-400 hover:text-zinc-100 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-3 text-xs font-sans">
          {error && (
            <div className="p-2 rounded-sm bg-rose-950/60 border border-rose-800 text-rose-300 font-mono text-[11px]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              PROJECT
            </label>
            <select
              value={projectId || (projects[0]?.id || "proj-1")}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#090a0a] border border-[#1c201e] text-zinc-200 rounded-sm px-2 py-1.5 focus:outline-none focus:border-emerald-500 font-mono text-xs cursor-pointer"
            >
              {projects.length > 0 ? (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              ) : (
                <option value="proj-1">Core Platform</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              TITLE
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement workspace RBAC policy evaluation"
              className="w-full bg-[#090a0a] border border-[#1c201e] text-zinc-100 rounded-sm px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 text-xs placeholder-zinc-600 font-sans"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">
              DESCRIPTION
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed acceptance criteria or technical context..."
              className="w-full bg-[#090a0a] border border-[#1c201e] text-zinc-200 rounded-sm px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 text-xs placeholder-zinc-600 font-sans resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                TYPE
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkItemType)}
                className="w-full bg-[#090a0a] border border-[#1c201e] text-zinc-200 rounded-sm px-2 py-1 focus:outline-none focus:border-emerald-500 text-xs cursor-pointer"
              >
                <option value="TASK">TASK</option>
                <option value="BUG">BUG</option>
                <option value="FEATURE">FEATURE</option>
                <option value="EPIC">EPIC</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                PRIORITY
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as WorkItemPriority)
                }
                className="w-full bg-[#090a0a] border border-[#1c201e] text-zinc-200 rounded-sm px-2 py-1 focus:outline-none focus:border-emerald-500 text-xs cursor-pointer"
              >
                <option value="P0">P0 (Critical)</option>
                <option value="P1">P1 (High)</option>
                <option value="P2">P2 (Normal)</option>
                <option value="P3">P3 (Low)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                ESTIMATE
              </label>
              <input
                type="text"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="e.g. 3d"
                className="w-full bg-[#090a0a] border border-[#1c201e] text-zinc-200 rounded-sm px-2 py-1 focus:outline-none focus:border-emerald-500 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1c201e] font-mono">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1 rounded-sm bg-[#161a18] text-zinc-300 hover:bg-[#1c201e] transition-colors border border-[#1c201e]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1 rounded-sm bg-[#064e3b] hover:bg-[#064e3b]/80 text-emerald-300 font-semibold border border-emerald-600 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create Work Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
