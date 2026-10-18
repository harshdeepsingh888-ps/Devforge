import React, { useState } from "react";
import type { Project, Workspace } from "../types/api.types";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  workspace: Workspace;
  projects: Project[];
  activeProject: Project;
  onSelectProject: (project: Project) => void;
  onProjectCreated: (project: Project) => void;
  onProjectUpdated: (project: Project) => void;
  onProjectDeleted: (projectId: string) => void;
  onSwitchWorkspace: () => void;
  onLogout: () => void | Promise<void>;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  workspace,
  projects,
  activeProject,
  onSelectProject,
  onProjectCreated,
  onProjectUpdated,
  onProjectDeleted,
  onSwitchWorkspace,
  onLogout,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleSelectProject = (project: Project) => {
    onSelectProject(project);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#ffffff] text-[#0a0a0a] font-sans">
      {/* TOPBAR */}
      <Topbar
        workspace={workspace}
        project={activeProject}
        projects={projects.filter((p) => p.status !== "ARCHIVED")}
        onSelectProject={onSelectProject}
        onSwitchWorkspace={onSwitchWorkspace}
        onLogout={onLogout}
        onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
      />

      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <div className="hidden md:block shrink-0 h-full">
          <Sidebar
            workspace={workspace}
            projects={projects}
            activeProject={activeProject}
            onSelectProject={onSelectProject}
            onProjectCreated={onProjectCreated}
            onProjectUpdated={onProjectUpdated}
            onProjectDeleted={onProjectDeleted}
            onSwitchWorkspace={onSwitchWorkspace}
          />
        </div>

        {/* MOBILE SIDEBAR OVERLAY */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-xs"
            />
            <div className="relative flex w-64 max-w-[80%] flex-col bg-[#f9f8f6] border-r border-[#d5d9e2] shadow-xl">
              <Sidebar
                workspace={workspace}
                projects={projects}
                activeProject={activeProject}
                onSelectProject={handleSelectProject}
                onProjectCreated={(p) => {
                  onProjectCreated(p);
                  setMobileSidebarOpen(false);
                }}
                onProjectUpdated={onProjectUpdated}
                onProjectDeleted={(id) => {
                  onProjectDeleted(id);
                  setMobileSidebarOpen(false);
                }}
                onSwitchWorkspace={onSwitchWorkspace}
              />
            </div>
          </div>
        )}

        {/* MAIN INSET WORKSPACE CONTENT */}
        <div className="min-w-0 flex-1 flex flex-col overflow-hidden bg-[#f9f8f6]">
          {children}
        </div>
      </div>
    </div>
  );
};