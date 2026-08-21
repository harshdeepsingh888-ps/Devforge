import React, { useEffect, useState } from "react";
import { CheckCircle2, FileText, Lock, Plus } from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiService } from "../services/api.service";
import type { TechnicalSpecification } from "../types/api.types";

export const SpecsPage: React.FC = () => {
  const { activeWorkspace, activeProject, projects } = useWorkspace();
  const [specs, setSpecs] = useState<TechnicalSpecification[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<TechnicalSpecification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState(activeProject?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSpecs = async () => {
    if (!activeWorkspace) return;
    try {
      let list = await apiService.getSpecs(activeWorkspace.id);
      if (list.length === 0) {
        // Seed default spec
        const defaultSpec = await apiService.createSpec(activeWorkspace.id, {
          projectId: projects[0]?.id || "proj-1",
          title: "RBAC Anti-Enumeration & IDOR 404 Specification",
          content:
            "Requirement: Any unauthorized lookups across workspaces MUST return HTTP 404 Not Found instead of 403 Forbidden to prevent enumeration of internal resources.",
        });
        list = [defaultSpec];
      }
      setSpecs(list);
      if (!selectedSpec && list.length > 0) {
        setSelectedSpec(list[0]);
      }
    } catch (err) {
      console.error("Failed to load Technical Specs:", err);
    }
  };

  useEffect(() => {
    loadSpecs();
  }, [activeWorkspace?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !title.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await apiService.createSpec(activeWorkspace.id, {
        projectId: projectId || projects[0]?.id || "proj-1",
        title,
        content,
      });
      setSpecs((prev) => [created, ...prev]);
      setSelectedSpec(created);
      setIsModalOpen(false);
      setTitle("");
      setContent("");
    } catch (err: any) {
      setError(err.message || "Failed to create spec.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (specId: string) => {
    if (!activeWorkspace) return;
    try {
      const updated = await apiService.approveSpec(activeWorkspace.id, specId);
      setSpecs((prev) => prev.map((s) => (s.id === specId ? updated : s)));
      setSelectedSpec(updated);
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h1 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
              TECHNICAL SPECIFICATIONS
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Detailed engineering specifications, API contracts, and requirements
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs font-mono transition-colors shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New Specification</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Left Spec List */}
        <div className="bg-[#0c0c0e] border border-zinc-800 rounded p-2 overflow-y-auto space-y-2">
          {specs.map((spec) => {
            const isSelected = selectedSpec?.id === spec.id;
            return (
              <div
                key={spec.id}
                onClick={() => setSelectedSpec(spec)}
                className={`p-3 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-500 bg-zinc-900/90"
                    : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 font-mono">
                  <span className="text-[11px] font-bold text-blue-400">
                    {spec.id.substring(0, 8)}
                  </span>
                  <StatusBadge status={spec.status} />
                </div>
                <h3 className="text-xs font-medium text-zinc-200 line-clamp-2">
                  {spec.title}
                </h3>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        <div className="col-span-2 bg-[#0c0c0e] border border-zinc-800 rounded p-5 overflow-y-auto space-y-5">
          {selectedSpec ? (
            <>
              <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs mb-1">
                    <span className="text-blue-400 font-bold">
                      {selectedSpec.id}
                    </span>
                    <StatusBadge status={selectedSpec.status} />
                    {selectedSpec.status === "APPROVED" && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <Lock className="w-3 h-3" /> READ-ONLY
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-zinc-100">
                    {selectedSpec.title}
                  </h2>
                </div>

                {/* Approve Button */}
                {selectedSpec.status === "DRAFT" && (
                  <button
                    onClick={() => handleApprove(selectedSpec.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-medium transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Spec</span>
                  </button>
                )}
              </div>

              {/* Spec Content */}
              <div>
                <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mb-2">
                  Specification Body
                </h4>
                <div className="p-4 bg-zinc-900/60 rounded border border-zinc-800 text-zinc-200 leading-relaxed font-mono text-xs whitespace-pre-wrap">
                  {selectedSpec.content}
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-xs">
              Select a technical specification to view details.
            </div>
          )}
        </div>
      </div>

      {/* Modal to Create Spec */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 font-mono">
              CREATE TECHNICAL SPECIFICATION
            </h3>
            {error && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 font-mono text-xs">
                {error}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CI/CD Gated Deployment & Pipeline Run Engine Spec"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Specification Content
                </label>
                <textarea
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detailed functional & technical requirements..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono"
                >
                  {isSubmitting ? "Creating..." : "Save Draft Spec"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
