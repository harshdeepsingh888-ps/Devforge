import React from "react";
import { Settings, Shield, Users } from "lucide-react";
import { useWorkspace } from "../context/WorkspaceContext";

export const SettingsPage: React.FC = () => {
  const { activeWorkspace, members, teams } = useWorkspace();

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-xs">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-zinc-400" />
          <h1 className="text-lg font-bold text-zinc-100 font-mono uppercase tracking-wide">
            WORKSPACE SETTINGS & GOVERNANCE
          </h1>
        </div>
        <p className="text-xs text-zinc-400 font-sans mt-0.5">
          Workspace properties, RBAC member privileges, and team configurations
        </p>
      </div>

      {/* Workspace Properties */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded p-4 space-y-3">
        <h3 className="font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider">
          Workspace Information
        </h3>
        <div className="grid grid-cols-2 gap-4 font-mono text-xs">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase">Workspace Name</label>
            <div className="text-zinc-200 font-semibold mt-1">
              {activeWorkspace?.name || "Core Engine Workspace"}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase">Workspace Slug</label>
            <div className="text-blue-400 font-mono mt-1">
              {activeWorkspace?.slug || "core-engine-workspace"}
            </div>
          </div>
        </div>
      </div>

      {/* Members & RBAC */}
      <div className="bg-[#0c0c0e] border border-zinc-800 rounded overflow-hidden space-y-2">
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 font-mono text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Workspace Members & RBAC Roles</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-normal">
            Multi-Tenant Isolation Active
          </span>
        </div>

        <div className="divide-y divide-zinc-800/60 font-mono">
          <div className="flex items-center justify-between p-3 px-4 hover:bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-zinc-100 font-bold">Harshdeep Singh</span>
              <span className="text-zinc-500 text-[11px]">(dev@devforge.io)</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-400 font-bold text-[10px]">
              OWNER
            </span>
          </div>

          <div className="flex items-center justify-between p-3 px-4 hover:bg-zinc-900/40">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-zinc-200">Alice Dev</span>
              <span className="text-zinc-500 text-[11px]">(alice@devforge.io)</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-400 font-bold text-[10px]">
              DEVELOPER
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
