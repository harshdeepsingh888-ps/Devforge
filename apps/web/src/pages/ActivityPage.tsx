import React from "react";
import { Activity, CheckCircle2, GitCommit, Layers, Play, Shield, Tag } from "lucide-react";
import { StatusBadge } from "../components/common/StatusBadge";

export const ActivityPage: React.FC = () => {
  const activities = [
    {
      id: "act-1",
      icon: <Tag className="w-4 h-4 text-blue-400" />,
      title: "Work Item DF-142 status updated to IN_PROGRESS",
      actor: "@alice",
      time: "10 minutes ago",
    },
    {
      id: "act-2",
      icon: <GitCommit className="w-4 h-4 text-emerald-400" />,
      title: 'Commit c8a91f2 ingested: "feat(auth): add workspace RBAC"',
      actor: "@dev",
      time: "1 hour ago",
    },
    {
      id: "act-3",
      icon: <Shield className="w-4 h-4 text-cyan-400" />,
      title: "Architecture Decision Record ADR-001 ACCEPTED",
      actor: "@harshdeep (OWNER)",
      time: "2 hours ago",
    },
    {
      id: "act-4",
      icon: <Play className="w-4 h-4 text-rose-400" />,
      title: "Pipeline Run #job-8821 finished with SUCCESS status",
      actor: "GitHub Actions",
      time: "3 hours ago",
    },
    {
      id: "act-5",
      icon: <CheckCircle2 className="w-4 h-4 text-amber-400" />,
      title: "Deployment dep-501 to PROD environment completed",
      actor: "Deployment Gate Engine",
      time: "3 hours ago",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
            GLOBAL ACTIVITY STREAM
          </h1>
        </div>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Chronological engineering events, audit trail, and workspace lineage
        </p>
      </div>

      <div className="bg-[#0c0c0e] border border-zinc-800 rounded divide-y divide-zinc-800/80">
        {activities.map((act) => (
          <div key={act.id} className="flex items-center justify-between p-4 hover:bg-zinc-900/60 transition-colors">
            <div className="flex items-center gap-3">
              {act.icon}
              <span className="text-xs font-medium text-zinc-200">{act.title}</span>
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px] text-zinc-500">
              <span>{act.actor}</span>
              <span>{act.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
