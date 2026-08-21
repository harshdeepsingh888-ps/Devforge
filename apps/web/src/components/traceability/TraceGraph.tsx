import React, { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  FileText,
  FolderGit2,
  Layers,
  Play,
  Rocket,
  Shield,
  Tag,
} from "lucide-react";
import { StatusBadge } from "../common/StatusBadge";
import type {
  ArchitectureDecision,
  Commit,
  Deployment,
  PipelineRun,
  TechnicalSpecification,
  WorkItem,
} from "../../types/api.types";

interface TraceGraphProps {
  adrs: ArchitectureDecision[];
  specs: TechnicalSpecification[];
  workItems: WorkItem[];
  commits: Commit[];
  runs: PipelineRun[];
}

export const TraceGraph: React.FC<TraceGraphProps> = ({
  adrs,
  specs,
  workItems,
  commits,
  runs,
}) => {
  const [selectedNode, setSelectedNode] = useState<{
    type: "ADR" | "SPEC" | "WORK_ITEM" | "COMMIT" | "RUN" | "DEPLOYMENT";
    title: string;
    details: Record<string, string>;
  } | null>(null);

  const sampleAdr = adrs[0] || {
    id: "adr-001",
    title: "Multi-tenant Workspace Isolation Architecture",
    status: "ACCEPTED",
    context: "Workspace boundaries must isolate all entity queries.",
    createdAt: new Date().toISOString(),
  };

  const sampleSpec = specs[0] || {
    id: "spec-101",
    title: "RBAC & Anti-Enumeration 404 Spec",
    status: "APPROVED",
    content: "Return 404 Not Found on cross-tenant resource lookups.",
    createdAt: new Date().toISOString(),
  };

  const sampleWorkItem = workItems[0] || {
    id: "DF-142",
    title: "Implement workspace RBAC policy evaluation",
    status: "IN_PROGRESS",
    priority: "P1",
    type: "TASK",
    createdAt: new Date().toISOString(),
  };

  const sampleCommit = commits[0] || {
    id: "commit-999",
    externalId: "c8a91f2",
    message: "feat(auth): implement workspace RBAC policy evaluation DF-142",
    authorName: "Alice Dev",
    committedAt: new Date().toISOString(),
  };

  const sampleRun = runs[0] || {
    id: "run-101",
    externalRunId: "job-8821",
    status: "SUCCESS",
    startedAt: new Date(Date.now() - 340000).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 340000,
  };

  const sampleDeployment = {
    id: "dep-501",
    environment: "PROD",
    status: "DEPLOYED",
    deployedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Node Pipeline Flow */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded p-6 shadow-xl">
        <div className="text-xs font-mono font-semibold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>V3 End-to-End Traceability Lifecycle</span>
        </div>

        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
          {/* Node 1: ADR */}
          <div
            onClick={() =>
              setSelectedNode({
                type: "ADR",
                title: sampleAdr.title,
                details: {
                  ID: sampleAdr.id,
                  Status: sampleAdr.status,
                  Context: sampleAdr.context || "Workspace isolation boundary",
                  Created: new Date(sampleAdr.createdAt).toLocaleDateString(),
                },
              })
            }
            className="flex-1 min-w-[160px] bg-zinc-900/80 border border-cyan-800/60 hover:border-cyan-500 rounded p-3 cursor-pointer transition-all hover:scale-105"
          >
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase font-bold mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>1. Architecture</span>
            </div>
            <div className="text-xs font-semibold text-zinc-200 truncate">
              {sampleAdr.title}
            </div>
            <div className="mt-2">
              <StatusBadge status={sampleAdr.status} />
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />

          {/* Node 2: Spec */}
          <div
            onClick={() =>
              setSelectedNode({
                type: "SPEC",
                title: sampleSpec.title,
                details: {
                  ID: sampleSpec.id,
                  Status: sampleSpec.status,
                  Created: new Date(sampleSpec.createdAt).toLocaleDateString(),
                },
              })
            }
            className="flex-1 min-w-[160px] bg-zinc-900/80 border border-blue-800/60 hover:border-blue-500 rounded p-3 cursor-pointer transition-all hover:scale-105"
          >
            <div className="flex items-center gap-1.5 text-blue-400 font-mono text-[10px] uppercase font-bold mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>2. Technical Spec</span>
            </div>
            <div className="text-xs font-semibold text-zinc-200 truncate">
              {sampleSpec.title}
            </div>
            <div className="mt-2">
              <StatusBadge status={sampleSpec.status} />
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />

          {/* Node 3: WorkItem */}
          <div
            onClick={() =>
              setSelectedNode({
                type: "WORK_ITEM",
                title: sampleWorkItem.title,
                details: {
                  ID: sampleWorkItem.id,
                  Status: sampleWorkItem.status,
                  Priority: sampleWorkItem.priority,
                  Type: sampleWorkItem.type,
                },
              })
            }
            className="flex-1 min-w-[160px] bg-zinc-900/80 border border-purple-800/60 hover:border-purple-500 rounded p-3 cursor-pointer transition-all hover:scale-105"
          >
            <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[10px] uppercase font-bold mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>3. Work Item</span>
            </div>
            <div className="text-xs font-semibold text-zinc-200 truncate">
              {sampleWorkItem.id}: {sampleWorkItem.title}
            </div>
            <div className="mt-2">
              <StatusBadge status={sampleWorkItem.status} />
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />

          {/* Node 4: Commit */}
          <div
            onClick={() =>
              setSelectedNode({
                type: "COMMIT",
                title: sampleCommit.message,
                details: {
                  SHA: sampleCommit.externalId,
                  Author: sampleCommit.authorName,
                  Date: new Date(sampleCommit.committedAt).toLocaleString(),
                },
              })
            }
            className="flex-1 min-w-[160px] bg-zinc-900/80 border border-emerald-800/60 hover:border-emerald-500 rounded p-3 cursor-pointer transition-all hover:scale-105"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px] uppercase font-bold mb-1">
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>4. Commit</span>
            </div>
            <div className="text-xs font-mono text-zinc-200 truncate">
              {sampleCommit.externalId}: {sampleCommit.message}
            </div>
            <div className="mt-2 text-[10px] font-mono text-zinc-500">
              by {sampleCommit.authorName}
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />

          {/* Node 5: Pipeline Run */}
          <div
            onClick={() =>
              setSelectedNode({
                type: "RUN",
                title: `Run ${sampleRun.externalRunId}`,
                details: {
                  RunID: sampleRun.externalRunId,
                  Status: sampleRun.status,
                  Duration: `${(sampleRun.durationMs || 0) / 1000}s`,
                },
              })
            }
            className="flex-1 min-w-[160px] bg-zinc-900/80 border border-rose-800/60 hover:border-rose-500 rounded p-3 cursor-pointer transition-all hover:scale-105"
          >
            <div className="flex items-center gap-1.5 text-rose-400 font-mono text-[10px] uppercase font-bold mb-1">
              <Play className="w-3.5 h-3.5" />
              <span>5. Pipeline Run</span>
            </div>
            <div className="text-xs font-mono text-zinc-200 truncate">
              Run #{sampleRun.externalRunId}
            </div>
            <div className="mt-2">
              <StatusBadge status={sampleRun.status} />
            </div>
          </div>

          <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />

          {/* Node 6: Deployment */}
          <div
            onClick={() =>
              setSelectedNode({
                type: "DEPLOYMENT",
                title: `Deployment to ${sampleDeployment.environment}`,
                details: {
                  Environment: sampleDeployment.environment,
                  Status: sampleDeployment.status,
                  DeployedAt: new Date(
                    sampleDeployment.deployedAt,
                  ).toLocaleString(),
                },
              })
            }
            className="flex-1 min-w-[160px] bg-zinc-900/80 border border-amber-800/60 hover:border-amber-500 rounded p-3 cursor-pointer transition-all hover:scale-105"
          >
            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] uppercase font-bold mb-1">
              <Rocket className="w-3.5 h-3.5" />
              <span>6. Deployment</span>
            </div>
            <div className="text-xs font-semibold text-zinc-200 truncate">
              {sampleDeployment.environment} Production
            </div>
            <div className="mt-2">
              <StatusBadge status={sampleDeployment.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded p-4 font-mono text-xs animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-blue-400 font-bold uppercase">
              [{selectedNode.type}] Node Inspector
            </span>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-zinc-500 hover:text-zinc-300"
            >
              Close
            </button>
          </div>
          <div className="text-sm font-semibold text-zinc-100 font-sans">
            {selectedNode.title}
          </div>
          <div className="grid grid-cols-2 gap-2 text-zinc-400 bg-black/40 p-3 rounded border border-zinc-800">
            {Object.entries(selectedNode.details).map(([k, v]) => (
              <div key={k}>
                <span className="text-zinc-500 uppercase text-[10px] block">
                  {k}
                </span>
                <span className="text-zinc-200 font-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
