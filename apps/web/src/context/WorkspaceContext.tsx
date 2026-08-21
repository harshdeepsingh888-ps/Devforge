import React, { createContext, useContext, useEffect, useState } from "react";
import { apiService } from "../services/api.service";
import type { Project, Team, Workspace, WorkspaceMember } from "../types/api.types";
import { useAuth } from "./AuthContext";

const DEFAULT_WORKSPACE: Workspace = {
  id: "ws-acme-core",
  name: "Acme Core Platform",
  slug: "acme",
  ownerId: "usr-devforge-master",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace;
  projects: Project[];
  activeProject: Project | null;
  teams: Team[];
  members: WorkspaceMember[];
  isLoading: boolean;
  error: string | null;
  selectWorkspace: (workspaceId: string) => void;
  selectProject: (projectId: string | null) => void;
  createWorkspace: (name: string) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([DEFAULT_WORKSPACE]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(DEFAULT_WORKSPACE);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshWorkspaces = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let list = await apiService.getWorkspaces().catch(() => []);
      if (list.length === 0) {
        // Create or fallback to default workspace
        const defaultWs = await apiService.createWorkspace("Core Engine Workspace").catch(() => DEFAULT_WORKSPACE);
        list = [defaultWs];
      }
      setWorkspaces(list);
      if (!list.find((w) => w.id === activeWorkspace.id)) {
        setActiveWorkspace(list[0]);
      }
    } catch (err: any) {
      console.warn("Using fallback workspace:", err?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProjects = async () => {
    const targetWsId = activeWorkspace.id || DEFAULT_WORKSPACE.id;
    try {
      let projList = await apiService.getProjects(targetWsId).catch(() => []);
      if (projList.length === 0) {
        // Create default projects matching requirements
        const p1 = await apiService.createProject(targetWsId, "Core Platform", "Backend microservices and API engine.").catch(() => null);
        const p2 = await apiService.createProject(targetWsId, "Web Client", "Engineering Control Plane UI.").catch(() => null);
        const p3 = await apiService.createProject(targetWsId, "Data Pipeline", "DORA & Telemetry processing pipeline.").catch(() => null);
        projList = [p1, p2, p3].filter(Boolean) as Project[];
        if (projList.length === 0) {
          const now = new Date().toISOString();
          projList = [
            { id: "proj-1", workspaceId: targetWsId, name: "Core Platform", description: "Backend microservices and API engine.", status: "ACTIVE", createdAt: now, updatedAt: now },
            { id: "proj-2", workspaceId: targetWsId, name: "Web Client", description: "Engineering Control Plane UI.", status: "ACTIVE", createdAt: now, updatedAt: now },
            { id: "proj-3", workspaceId: targetWsId, name: "Data Pipeline", description: "DORA & Telemetry processing pipeline.", status: "ACTIVE", createdAt: now, updatedAt: now },
          ];
        }
      }
      setProjects(projList);

      // Refresh Teams & Members
      let teamList = await apiService.getTeams(targetWsId).catch(() => []);
      if (teamList.length === 0) {
        const t1 = await apiService.createTeam(targetWsId, "Backend", "Core platform backend team.").catch(() => null);
        const t2 = await apiService.createTeam(targetWsId, "Frontend", "UI & Frontend engineering.").catch(() => null);
        const t3 = await apiService.createTeam(targetWsId, "Platform", "Infrastructure & DevOps.").catch(() => null);
        const t4 = await apiService.createTeam(targetWsId, "Data", "Analytics & Data pipeline.").catch(() => null);
        teamList = [t1, t2, t3, t4].filter(Boolean) as Team[];
      }
      setTeams(teamList);

      const memList = await apiService.getWorkspaceMembers(targetWsId).catch(() => []);
      setMembers(memList);
    } catch (err: any) {
      console.error("Error loading workspace projects/teams:", err);
    }
  };

  useEffect(() => {
    refreshWorkspaces();
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeWorkspace) {
      refreshProjects();
    }
  }, [activeWorkspace?.id]);

  const selectWorkspace = (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      setActiveProject(null);
    }
  };

  const selectProject = (projectId: string | null) => {
    if (!projectId) {
      setActiveProject(null);
      return;
    }
    const p = projects.find((proj) => proj.id === projectId);
    setActiveProject(p || null);
  };

  const createWorkspace = async (name: string) => {
    const now = new Date().toISOString();
    const ws: Workspace = await apiService.createWorkspace(name).catch(() => ({
      id: `ws-${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      ownerId: "usr-devforge-master",
      createdAt: now,
      updatedAt: now,
    }));
    setWorkspaces((prev) => [...prev, ws]);
    setActiveWorkspace(ws);
  };

  const createProject = async (name: string, description?: string) => {
    const targetWsId = activeWorkspace.id || DEFAULT_WORKSPACE.id;
    const now = new Date().toISOString();
    const p: Project = await apiService.createProject(targetWsId, name, description).catch(() => ({
      id: `proj-${Date.now()}`,
      workspaceId: targetWsId,
      name,
      description: description || null,
      status: "ACTIVE" as const,
      createdAt: now,
      updatedAt: now,
    }));
    setProjects((prev) => [...prev, p]);
    setActiveProject(p);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        projects,
        activeProject,
        teams,
        members,
        isLoading,
        error,
        selectWorkspace,
        selectProject,
        createWorkspace,
        createProject,
        refreshWorkspaces,
        refreshProjects,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
