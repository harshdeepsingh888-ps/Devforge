import React, { useEffect, useState } from "react";
import { CheckCircle2, FileCode2, Plus, Shield, XCircle } from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiService } from "../services/api.service";
import type { ArchitectureDecision } from "../types/api.types";

export const ArchitecturePage: React.FC = () => {
  const { activeWorkspace, activeProject } = useWorkspace();
  const [adrs, setAdrs] = useState<ArchitectureDecision[]>([]);
  const [selectedAdr, setSelectedAdr] = useState<ArchitectureDecision | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [decision, setDecision] = useState("");
  const [consequences, setConsequences] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAdrs = async () => {
    if (!activeWorkspace) return;
    try {
      let list = await apiService.getAdrs(activeWorkspace.id);
      if (list.length === 0) {
        // Seed default ADR if empty
        const defaultAdr = await apiService.createAdr(activeWorkspace.id, {
          projectId: activeProject?.id,
          title: "Multi-tenant Workspace Isolation Architecture",
          context: "All entity queries must be strictly scoped to workspaceId to prevent cross-tenant data leaks.",
          decision: "Use Prisma findFirst({ where: { id, workspaceId } }) for all entity lookups.",
          consequences: "Eliminates IDOR vulnerability and guarantees tenant boundary isolation.",
        });
        list = [defaultAdr];
      }
      setAdrs(list);
      if (!selectedAdr && list.length > 0) {
        setSelectedAdr(list[0]);
      }
    } catch (err) {
      console.error("Failed to load ADRs:", err);
    }
  };

  useEffect(() => {
    loadAdrs();
  }, [activeWorkspace?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !title.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await apiService.createAdr(activeWorkspace.id, {
        projectId: activeProject?.id,
        title,
        context,
        decision,
        consequences,
      });
      setAdrs((prev) => [created, ...prev]);
      setSelectedAdr(created);
      setIsModalOpen(false);
      setTitle("");
      setContext("");
      setDecision("");
      setConsequences("");
    } catch (err: any) {
      setError(err.message || "Failed to create ADR.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async (adrId: string) => {
    if (!activeWorkspace) return;
    try {
      const updated = await apiService.acceptAdr(activeWorkspace.id, adrId);
      setAdrs((prev) => prev.map((a) => (a.id === adrId ? updated : a)));
      setSelectedAdr(updated);
    } catch (err: any) {
      alert(`Accept failed: ${err.message}`);
    }
  };

  const handleReject = async (adrId: string) => {
    if (!activeWorkspace) return;
    try {
      const updated = await apiService.rejectAdr(activeWorkspace.id, adrId);
      setAdrs((prev) => prev.map((a) => (a.id === adrId ? updated : a)));
      setSelectedAdr(updated);
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
              ARCHITECTURE DECISION RECORDS (ADR)
            </h1>
          </div>
          <p className="text-xs text-zinc-400 font-sans mt-0.5">
            Preserve immutable technical decisions and architectural lineage
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs font-mono transition-colors shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New ADR</span>
        </button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
        {/* Left List */}
        <div className="bg-[#0c0c0e] border border-zinc-800 rounded p-2 overflow-y-auto space-y-2">
          {adrs.map((adr) => {
            const isSelected = selectedAdr?.id === adr.id;
            return (
              <div
                key={adr.id}
                onClick={() => setSelectedAdr(adr)}
                className={`p-3 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? "border-cyan-500 bg-zinc-900/90"
                    : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 font-mono">
                  <span className="text-[11px] font-bold text-cyan-400">
                    {adr.id.substring(0, 8)}
                  </span>
                  <StatusBadge status={adr.status} />
                </div>
                <h3 className="text-xs font-medium text-zinc-200 line-clamp-2">
                  {adr.title}
                </h3>
              </div>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        <div className="col-span-2 bg-[#0c0c0e] border border-zinc-800 rounded p-5 overflow-y-auto space-y-5">
          {selectedAdr ? (
            <>
              <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs mb-1">
                    <span className="text-cyan-400 font-bold">
                      {selectedAdr.id}
                    </span>
                    <StatusBadge status={selectedAdr.status} />
                  </div>
                  <h2 className="text-base font-bold text-zinc-100">
                    {selectedAdr.title}
                  </h2>
                </div>

                {/* RBAC Action Buttons */}
                {selectedAdr.status === "PROPOSED" && (
                  <div className="flex items-center gap-2 font-mono">
                    <button
                      onClick={() => handleAccept(selectedAdr.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept</span>
                    </button>
                    <button
                      onClick={() => handleReject(selectedAdr.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Sections */}
              <div className="space-y-4 text-xs font-sans">
                <div>
                  <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mb-1">
                    Context & Problem Statement
                  </h4>
                  <div className="p-3 bg-zinc-900/60 rounded border border-zinc-800 text-zinc-300 leading-relaxed font-mono text-[11px]">
                    {selectedAdr.context}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mb-1">
                    Decision Taken
                  </h4>
                  <div className="p-3 bg-zinc-900/60 rounded border border-zinc-800 text-zinc-200 font-semibold leading-relaxed">
                    {selectedAdr.decision}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mb-1">
                    Consequences & Engineering Trade-offs
                  </h4>
                  <div className="p-3 bg-zinc-900/60 rounded border border-zinc-800 text-zinc-300 leading-relaxed font-mono text-[11px]">
                    {selectedAdr.consequences}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-zinc-500 font-mono text-xs">
              Select an Architecture Decision Record to inspect details.
            </div>
          )}
        </div>
      </div>

      {/* Modal to Create ADR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0c0c0e] border border-zinc-800 rounded-lg p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 font-mono">
              CREATE ARCHITECTURE DECISION RECORD
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
                  placeholder="e.g. AWS RDS IAM Authentication & SSL Enforcement"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Context
                </label>
                <textarea
                  rows={2}
                  required
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Background context and technical motivation..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Decision
                </label>
                <textarea
                  rows={2}
                  required
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  placeholder="The precise architectural decision..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-1">
                  Consequences
                </label>
                <textarea
                  rows={2}
                  required
                  value={consequences}
                  onChange={(e) => setConsequences(e.target.value)}
                  placeholder="Consequences, benefits, and trade-offs..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-100"
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
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-mono"
                >
                  {isSubmitting ? "Submitting..." : "Submit ADR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
