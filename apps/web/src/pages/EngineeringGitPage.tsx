import React, { useEffect, useState } from "react";
import { FolderGit2, GitBranch, GitCommit, Plus } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";
import { apiService } from "../services/api.service";
import type { Commit, Repository } from "../types/api.types";

export const EngineeringGitPage: React.FC = () => {
  const { activeWorkspace } = useWorkspace();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);

  const loadGitData = async () => {
    if (!activeWorkspace) return;
    try {
      let repoList = await apiService.getRepositories(activeWorkspace.id);
      if (repoList.length === 0) {
        // Seed default repository & commit if empty
        const defaultRepo = await apiService.createRepository(
          activeWorkspace.id,
          {
            name: "backend-api",
            provider: "GITHUB",
            externalId: "repo-99",
            url: "https://github.com/devforge/backend-api",
          },
        );
        const defaultCommit = await apiService.ingestCommit(
          activeWorkspace.id,
          defaultRepo.id,
          {
            externalId: "c8a91f2",
            message:
              "feat(auth): implement workspace RBAC policy evaluation DF-142",
            authorName: "Alice Dev",
            authorEmail: "alice@devforge.io",
            url: "https://github.com/devforge/backend-api/commit/c8a91f2",
          },
        );
        repoList = [defaultRepo];
        setCommits([defaultCommit]);
      }
      setRepos(repoList);
      if (!selectedRepo && repoList.length > 0) {
        setSelectedRepo(repoList[0]);
        const commitList = await apiService.getCommits(
          activeWorkspace.id,
          repoList[0].id,
        );
        setCommits(commitList);
      }
    } catch (err) {
      console.error("Failed to load Git data:", err);
    }
  };

  useEffect(() => {
    loadGitData();
  }, [activeWorkspace?.id]);

  const handleSelectRepo = async (repo: Repository) => {
    if (!activeWorkspace) return;
    setSelectedRepo(repo);
    try {
      const commitList = await apiService.getCommits(
        activeWorkspace.id,
        repo.id,
      );
      setCommits(commitList);
    } catch (err) {
      console.error("Failed to load commits:", err);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <FolderGit2 className="w-5 h-5 text-emerald-400" />
          <h1 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
            GIT REPOSITORIES & COMMITS STREAM
          </h1>
        </div>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Version control traceability & auto-linked engineering commit history
        </p>
      </div>

      {/* Repositories Strip */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {repos.map((r) => {
          const isSelected = selectedRepo?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => handleSelectRepo(r)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-all ${
                isSelected
                  ? "bg-zinc-800 border-emerald-500 text-zinc-100 font-bold"
                  : "bg-[#0c0c0e] border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{r.name}</span>
            </button>
          );
        })}
      </div>

      {/* Commits Stream Table */}
      <div className="flex-1 bg-[#0c0c0e] border border-zinc-800 rounded overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-2.5 px-4">SHA</th>
              <th className="py-2.5 px-4">Commit Message</th>
              <th className="py-2.5 px-4">Author</th>
              <th className="py-2.5 px-4">Date</th>
              <th className="py-2.5 px-4">Auto-Linked Entities</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {commits.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-zinc-900/60 transition-colors text-zinc-300"
              >
                <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                  {c.externalId.substring(0, 7)}
                </td>
                <td className="py-3 px-4 font-medium text-zinc-100">
                  {c.message}
                </td>
                <td className="py-3 px-4 font-mono text-zinc-400 text-[11px]">
                  {c.authorName}
                </td>
                <td className="py-3 px-4 font-mono text-zinc-500 text-[10px]">
                  {new Date(c.committedAt).toLocaleString()}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-800 text-blue-400 font-mono text-[10px]">
                    DF-142
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
