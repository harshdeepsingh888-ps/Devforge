import React, { useState } from "react";
import {
  Activity,
  BarChart2,
  CheckSquare,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FileCode2,
  FileText,
  FolderGit2,
  FolderKanban,
  Kanban,
  Layers,
  Play,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const {
    workspaces,
    activeWorkspace,
    selectWorkspace,
    projects,
    activeProject,
    selectProject,
    teams,
  } = useWorkspace();

  const navItemClass = (page: string) =>
    `flex items-center gap-2 px-2 py-1 text-xs font-mono transition-all duration-150 ${
      activePage === page
        ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
        : "text-[#6b7280] hover:bg-[#0b0f0d] hover:text-[#e5e7eb]"
    }`;

  return (
    <aside
      className={`relative z-20 flex flex-col border-r border-[#161a18] bg-[#050706] transition-all duration-150 shrink-0 ${
        isCollapsed ? "w-11" : "w-44"
      }`}
    >
      {/* Workspace Selector */}
      <div className="p-1.5 border-b border-[#161a18]">
        {!isCollapsed ? (
          <div className="relative">
            <button
              onClick={() => setIsWsDropdownOpen((prev) => !prev)}
              className="flex items-center justify-between w-full px-2 py-1 bg-[#080a09] border border-[#161a18] text-[#e5e7eb] hover:bg-[#0b0f0d] text-xs font-mono transition-colors"
            >
              <div className="flex items-center gap-1.5 truncate">
                <div className="w-3 h-3 bg-emerald-800 text-white flex items-center justify-center text-[8px] font-bold shrink-0">
                  D
                </div>
                <span className="truncate text-xs font-medium">
                  {activeWorkspace?.name || "Core Workspace"}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-[#6b7280] shrink-0" />
            </button>

            {isWsDropdownOpen && (
              <div className="absolute top-full left-0 mt-0.5 w-full bg-[#080a09] border border-[#161a18] shadow-2xl z-30 py-0.5 font-mono text-xs">
                <div className="px-2 py-0.5 text-[9px] text-[#9ca3af] uppercase tracking-wider font-semibold">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      selectWorkspace(ws.id);
                      setIsWsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1 hover:bg-[#0b0f0d] transition-colors ${
                      ws.id === activeWorkspace?.id
                        ? "text-emerald-400 font-bold"
                        : "text-[#6b7280]"
                    }`}
                  >
                    {ws.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-6 h-6 mx-auto bg-emerald-800 text-white flex items-center justify-center text-[10px] font-bold font-mono">
            DF
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto p-1 space-y-2.5 font-mono text-xs select-none">
        {/* DISPATCH */}
        <div>
          {!isCollapsed && (
            <div className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              DISPATCH
            </div>
          )}
          <div className="space-y-0.5">
            <button
              onClick={() => onNavigate("dispatch")}
              className={`w-full ${navItemClass("dispatch")}`}
              title="Dispatch"
            >
              <Zap className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>Dispatch</span>}
            </button>
            <button
              onClick={() => onNavigate("workstream")}
              className={`w-full ${navItemClass("workstream")}`}
              title="Work Stream Kanban"
            >
              <Kanban className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>Work Stream</span>}
            </button>
          </div>
        </div>

        {/* PROJECTS */}
        <div>
          {!isCollapsed && (
            <div className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              PROJECTS
            </div>
          )}

          <div className="space-y-0.5">
            {projects.map((proj) => {
              const isSelected = activeProject?.id === proj.id && activePage === "workstream";
              return (
                <button
                  key={proj.id}
                  onClick={() => {
                    selectProject(proj.id);
                    onNavigate("workstream");
                  }}
                  className={`flex items-center gap-1.5 w-full px-2 py-1 text-xs transition-all duration-150 truncate ${
                    isSelected
                      ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400 font-semibold"
                      : "text-[#6b7280] hover:text-[#e5e7eb] hover:bg-[#0b0f0d]"
                  }`}
                >
                  <FolderKanban className="w-3 h-3 shrink-0" />
                  <span className="truncate">{proj.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TEAMS */}
        {!isCollapsed && teams.length > 0 && (
          <div>
            <div className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              TEAMS
            </div>
            <div className="space-y-0.5">
              {teams.slice(0, 4).map((team) => (
                <div
                  key={team.id}
                  onClick={() => onNavigate("workstream")}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#6b7280] hover:text-[#e5e7eb] hover:bg-[#0b0f0d] transition-colors cursor-pointer"
                >
                  <Users className="w-3 h-3 text-[#6b7280] shrink-0" />
                  <span className="truncate">{team.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKSPACE & TRACEABILITY */}
        <div>
          {!isCollapsed && (
            <div className="px-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#9ca3af]">
              WORKSPACE
            </div>
          )}
          <div className="space-y-0.5">
            <button
              onClick={() => onNavigate("traceability")}
              className={`w-full ${navItemClass("traceability")}`}
              title="Traceability Graph"
            >
              <CheckSquare className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>Traceability</span>}
            </button>
            <button
              onClick={() => onNavigate("architecture")}
              className={`w-full ${navItemClass("architecture")}`}
              title="Architecture Decisions"
            >
              <FileCode2 className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>ADRs</span>}
            </button>
            <button
              onClick={() => onNavigate("specs")}
              className={`w-full ${navItemClass("specs")}`}
              title="Technical Specs"
            >
              <FileText className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>Tech Specs</span>}
            </button>
            <button
              onClick={() => onNavigate("git")}
              className={`w-full ${navItemClass("git")}`}
              title="Git & Commits"
            >
              <FolderGit2 className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>Git Commits</span>}
            </button>
            <button
              onClick={() => onNavigate("cicd")}
              className={`w-full ${navItemClass("cicd")}`}
              title="CI/CD & Deployments"
            >
              <Play className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>CI/CD Pipelines</span>}
            </button>
            <button
              onClick={() => onNavigate("analytics")}
              className={`w-full ${navItemClass("analytics")}`}
              title="Analytics"
            >
              <BarChart2 className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>DORA Analytics</span>}
            </button>
            <button
              onClick={() => onNavigate("activity")}
              className={`w-full ${navItemClass("activity")}`}
              title="Activity"
            >
              <Activity className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>Activity Stream</span>}
            </button>
            <button
              onClick={() => onNavigate("settings")}
              className={`w-full ${navItemClass("settings")}`}
              title="Settings"
            >
              <Settings className="w-3 h-3 shrink-0" />
              {!isCollapsed && <span>Settings</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Collapse Footer Button */}
      <div className="p-1 border-t border-[#161a18] flex items-center justify-between">
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1 text-[#6b7280] hover:text-[#e5e7eb] hover:bg-[#0b0f0d] transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronsRight className="w-3 h-3" />
          ) : (
            <ChevronsLeft className="w-3 h-3" />
          )}
        </button>
      </div>
    </aside>
  );
};
