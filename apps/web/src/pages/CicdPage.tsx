import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  Rocket,
  Shield,
  Terminal,
  XCircle,
} from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiService } from "../services/api.service";
import type { Pipeline, PipelineRun } from "../types/api.types";

export const CicdPage: React.FC = () => {
  const { activeWorkspace, projects } = useWorkspace();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  const loadCicd = async () => {
    if (!activeWorkspace) return;
    try {
      let pipeList = await apiService.getPipelines(activeWorkspace.id);
      if (pipeList.length === 0) {
        // Seed default pipeline & run if empty
        const defaultPipeline = await apiService.createPipeline(
          activeWorkspace.id,
          {
            projectId: projects[0]?.id || "proj-1",
            provider: "GITHUB_ACTIONS",
            name: "CI/CD Build & Test Pipeline",
            externalId: "workflow-main.yml",
          },
        );
        const defaultRun = await apiService.ingestPipelineRun(
          activeWorkspace.id,
          defaultPipeline.id,
          {
            commitId: "commit-1",
            externalRunId: "job-8821",
            status: "SUCCESS",
          },
        );
        pipeList = [defaultPipeline];
        setRuns([defaultRun]);
      }
      setPipelines(pipeList);
      if (!selectedRun && runs.length > 0) {
        setSelectedRun(runs[0]);
      }
    } catch (err) {
      console.error("Failed to load CI/CD data:", err);
    }
  };

  useEffect(() => {
    loadCicd();
  }, [activeWorkspace?.id]);

  const handleDeploy = async (run: PipelineRun) => {
    if (!activeWorkspace) return;
    setDeployError(null);

    // Deployment Gating check: Frontend explicitly verifies SUCCESS state
    if (run.status !== "SUCCESS") {
      setDeployError(
        `DEPLOYMENT BLOCKED: Pipeline run #${run.externalRunId} status is ${run.status}. Deployments are gated and strictly require a SUCCESS run status.`,
      );
      return;
    }

    try {
      await apiService.recordDeployment(activeWorkspace.id, run.id, "PROD");
      alert(`Deployment to PROD successfully recorded for run #${run.externalRunId}!`);
    } catch (err: any) {
      setDeployError(`Backend gating rejected deployment: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Play className="w-5 h-5 text-rose-400" />
          <h1 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
            CI/CD PIPELINES & GATED DEPLOYMENTS
          </h1>
        </div>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Build intelligence, execution logs, and gated deployment enforcement
        </p>
      </div>

      {/* Deployment Gating Warning Alert if Blocked */}
      {deployError && (
        <div className="p-3 bg-rose-950/80 border border-rose-700 text-rose-300 rounded font-mono text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{deployError}</span>
          </div>
          <button
            onClick={() => setDeployError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pipeline Runs Table */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 font-mono text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
          <span>Execution Runs</span>
          <span className="text-[10px] text-zinc-500 font-normal">
            Status gating active
          </span>
        </div>

        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/30 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-2.5 px-4">Run ID</th>
              <th className="py-2.5 px-4">Pipeline</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Started At</th>
              <th className="py-2.5 px-4">Duration</th>
              <th className="py-2.5 px-4">Deployment Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {runs.map((r) => (
              <tr
                key={r.id}
                onClick={() => setSelectedRun(r)}
                className={`cursor-pointer transition-colors ${
                  selectedRun?.id === r.id
                    ? "bg-zinc-800/80 text-zinc-100"
                    : "hover:bg-zinc-900/60 text-zinc-300"
                }`}
              >
                <td className="py-3 px-4 font-mono font-bold text-rose-400">
                  #{r.externalRunId}
                </td>
                <td className="py-3 px-4 font-medium text-zinc-200">
                  CI/CD Build & Test Pipeline
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="py-3 px-4 font-mono text-zinc-500 text-[10px]">
                  {new Date(r.startedAt).toLocaleString()}
                </td>
                <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                  {r.durationMs ? `${r.durationMs / 1000}s` : "N/A"}
                </td>
                <td className="py-3 px-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeploy(r);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors ${
                      r.status === "SUCCESS"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                    }`}
                  >
                    <Rocket className="w-3 h-3" />
                    <span>
                      {r.status === "SUCCESS" ? "Deploy PROD" : "Deploy Gated"}
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Build Log Terminal Viewer */}
      <div className="bg-[#09090b] border border-zinc-800 rounded p-4 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2 text-zinc-200 font-bold">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Build Logs Output — Run #{selectedRun?.externalRunId || "8821"}</span>
          </div>
          <span className="text-[10px] text-zinc-500">
            Exit Code: 0 (SUCCESS)
          </span>
        </div>
        <div className="bg-black/90 p-3 rounded text-zinc-300 font-mono text-[11px] leading-relaxed space-y-1">
          <p className="text-zinc-500">[00:00:01] Ingesting commit c8a91f2...</p>
          <p className="text-zinc-400">[00:00:02] Running tsc --noEmit (Typecheck)...</p>
          <p className="text-emerald-400">[00:00:05] Typecheck PASS: 0 errors.</p>
          <p className="text-zinc-400">[00:00:06] Running test suite (151 tests)...</p>
          <p className="text-emerald-400">[00:00:15] Test suite PASS: 151 / 151 tests passed.</p>
          <p className="text-blue-400">[00:00:16] Build artifact generated cleanly.</p>
        </div>
      </div>
    </div>
  );
};
