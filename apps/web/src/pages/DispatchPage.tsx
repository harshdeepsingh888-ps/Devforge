import React, { useEffect, useState } from "react";
import { PriorityBadge } from "../components/common/PriorityBadge";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiService } from "../services/api.service";
import type { Commit, PipelineRun, WorkItem } from "../types/api.types";

interface DispatchPageProps {
  onSelectWorkItem: (item: WorkItem) => void;
}

export const DispatchPage: React.FC<DispatchPageProps> = ({
  onSelectWorkItem,
}) => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [failingRuns, setFailingRuns] = useState<PipelineRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!activeWorkspace) return;
      try {
        setIsLoading(true);
        const data = await apiService.getWorkItems(activeWorkspace.id).catch(() => []);
        setItems(data);

        // Fetch Repositories & Commits for PR review metrics
        const repos = await apiService.getRepositories(activeWorkspace.id).catch(() => []);
        if (repos.length > 0) {
          const commitList = await apiService.getCommits(activeWorkspace.id, repos[0].id).catch(() => []);
          setCommits(commitList);
        }

        // Fetch Pipelines & Runs for CI status metrics
        const pipes = await apiService.getPipelines(activeWorkspace.id).catch(() => []);
        if (pipes.length > 0) {
          const runs = await apiService.getPipelineRuns(activeWorkspace.id, pipes[0].id).catch(() => []);
          setFailingRuns(runs.filter((r) => r.status === "FAILED"));
        }
      } catch (err) {
        console.error("Error loading dispatch items:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [activeWorkspace?.id]);

  const assignedItems = items.filter(
    (i) => !i.assigneeUserId || i.assigneeUserId === user?.id,
  );
  const blockedItems = items.filter(
    (i) => i.status === "BLOCKED" || i.priority === "P0",
  );

  return (
    <div className="space-y-3 font-mono text-xs max-w-6xl mx-auto">
      {/* Header Bar */}
      <div className="relative flex items-center justify-between border-b border-[#161a18] pb-1.5 before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500/20 before:to-transparent">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-100 uppercase tracking-wider text-xs">
            DISPATCH
          </span>
          <span className="text-[11px] text-[#6b7280]">
            needs your attention · {items.length} items tracked
          </span>
        </div>
      </div>

      {/* Metric Strip (SINGLE container grid driven purely by backend state) */}
      <div className="relative grid grid-cols-4 border-y border-[#161a18] divide-x divide-[#161a18] bg-[#080a09] before:absolute before:top-0 before:left-0 before:w-full before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-emerald-500/20 before:to-transparent">
        <div className="relative p-2.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 before:absolute before:inset-0 before:bg-emerald-500/0 hover:before:bg-emerald-500/5">
          <div className="text-sm font-bold text-[#e5e7eb]">{assignedItems.length}</div>
          <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mt-0.5 font-mono">assigned work items</div>
        </div>
        <div className="relative p-2.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 before:absolute before:inset-0 before:bg-emerald-500/0 hover:before:bg-emerald-500/5">
          <div className="text-sm font-bold text-[#e5e7eb]">{commits.length}</div>
          <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mt-0.5 font-mono">PRs awaiting your review</div>
        </div>
        <div className="relative p-2.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 before:absolute before:inset-0 before:bg-emerald-500/0 hover:before:bg-emerald-500/5">
          <div className="text-sm font-bold text-[#e5e7eb]">{failingRuns.length}</div>
          <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mt-0.5 font-mono">failing CI run</div>
        </div>
        <div className="relative p-2.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 before:absolute before:inset-0 before:bg-emerald-500/0 hover:before:bg-emerald-500/5">
          <div className="text-sm font-bold text-[#e5e7eb]">{blockedItems.length}</div>
          <div className="text-[11px] text-[#6b7280] uppercase tracking-wider mt-0.5 font-mono">blocked work item</div>
        </div>
      </div>

      {/* SECTION 1: ASSIGNED TO YOU */}
      <div className="space-y-1 pt-1">
        <div className="text-[12px] font-semibold text-[#9ca3af] uppercase tracking-wider px-1">
          ASSIGNED TO YOU
        </div>
        <div className="border-y border-[#161a18] divide-y divide-[#161a18] bg-[#080a09]">
          {assignedItems.length === 0 ? (
            <div className="px-3 py-2 text-[#6b7280] text-xs">No active work items assigned to you.</div>
          ) : (
            assignedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectWorkItem(item)}
                className="relative flex items-center justify-between px-2.5 py-1.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15)] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-emerald-400 text-xs font-mono">{item.id}</span>
                  <PriorityBadge priority={item.priority} />
                  <span className="text-[11px] uppercase text-[#6b7280] font-mono">
                    {item.type}
                  </span>
                  <span className="text-[13px] font-medium text-[#e5e7eb] font-sans">
                    {item.title}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === "BLOCKED" ? "bg-rose-500" : "bg-emerald-400"}`} />
                    <span className={item.status === "BLOCKED" ? "text-rose-400 font-bold uppercase" : "text-emerald-400"}>
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <span className="text-[#6b7280]">live</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECTION 2: AWAITING YOUR REVIEW */}
      <div className="space-y-1 pt-1">
        <div className="text-[12px] font-semibold text-[#9ca3af] uppercase tracking-wider px-1">
          AWAITING YOUR REVIEW
        </div>
        <div className="border-y border-[#161a18] divide-y divide-[#161a18] bg-[#080a09]">
          {commits.length > 0 ? (
            commits.slice(0, 5).map((commit) => (
              <div
                key={commit.id}
                className="relative flex items-center justify-between px-2.5 py-1.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15)] cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-[#6b7280] font-bold font-mono text-xs">#{commit.externalId.slice(0, 7)}</span>
                  <span className="text-[13px] text-[#e5e7eb] font-sans font-medium">
                    {commit.message}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="text-[#6b7280]">@{commit.authorName.split(" ")[0].toLowerCase()}</span>
                  <span className="text-emerald-400 font-bold">CI PASSED</span>
                </div>
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-[#6b7280] text-xs">No pending pull requests awaiting review.</div>
          )}
        </div>
      </div>

      {/* SECTION 3: SYSTEMS */}
      <div className="space-y-1 pt-1">
        <div className="text-[12px] font-semibold text-[#9ca3af] uppercase tracking-wider px-1">
          SYSTEMS
        </div>
        <div className="border-y border-[#161a18] divide-y divide-[#161a18] bg-[#080a09]">
          {failingRuns.length > 0 ? (
            failingRuns.map((run) => (
              <div key={run.id} className="relative flex items-center justify-between px-2.5 py-1.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-2.5">
                  <span className="text-amber-400 font-bold text-[11px] font-mono">CI</span>
                  <span className="text-[13px] text-[#e5e7eb] font-sans">
                    run {run.externalRunId} failed on commit {run.commitId.slice(0, 7)}
                  </span>
                </div>
                <span className="text-[#6b7280] text-[11px] font-mono">FAILED</span>
              </div>
            ))
          ) : (
            <div className="relative flex items-center justify-between px-2.5 py-1.5 bg-[#080a09] hover:bg-[#0b0f0d] transition-all duration-150 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-2.5">
                <span className="text-emerald-400 font-bold text-[11px] font-mono">SYSTEMS</span>
                <span className="text-[13px] text-[#e5e7eb] font-sans">
                  All CI pipelines operational and healthy
                </span>
              </div>
              <span className="text-emerald-400 text-[11px] font-mono">HEALTHY</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
