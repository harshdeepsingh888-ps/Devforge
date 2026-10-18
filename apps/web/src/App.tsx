import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import { api } from "./api/api";
import {
  clearStoredTokens,
  getStoredRefreshToken,
  getStoredToken,
  onAuthRevoked,
} from "./services/api-client";

import { AppShell } from "./layout/AppShell";
import { AuthGate } from "./pages/AuthGate";
import { ProjectGate } from "./pages/ProjectGate";
import { WorkStream } from "./pages/WorkStream";
import { WorkspaceGate } from "./pages/WorkspaceGate";

import type {
  Project,
  Workspace,
} from "./types/api.types";

export const App: React.FC = () => {
  /*
   * AUTHENTICATION
   *
   * The access/refresh tokens are stored by api.login/api.register.
   * If there is no token or refresh session, AuthGate is the first screen.
   */
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(() =>
      Boolean(getStoredToken() || getStoredRefreshToken()),
    );

  /*
   * WORKSPACES
   *
   * Never assume that workspaces[0] is the active workspace.
   * The user explicitly selects a workspace through WorkspaceGate.
   */
  const [workspaces, setWorkspaces] = useState<
    Workspace[]
  >([]);

  const [activeWorkspace, setActiveWorkspace] =
    useState<Workspace | null>(null);

  /*
   * PROJECTS
   */
  const [projects, setProjects] = useState<
    Project[]
  >([]);

  const [activeProject, setActiveProject] =
    useState<Project | null>(null);

  /*
   * APP STATE
   */
  const [isLoading, setIsLoading] =
    useState<boolean>(() =>
      Boolean(getStoredToken() || getStoredRefreshToken()),
    );

  const [error, setError] = useState<
    string | null
  >(null);

  /*
   * LISTEN FOR AUTH REVOCATION
   */
  useEffect(() => {
    const unsubscribe = onAuthRevoked(() => {
      setIsAuthenticated(false);
      setWorkspaces([]);
      setActiveWorkspace(null);
      setProjects([]);
      setActiveProject(null);
    });

    return unsubscribe;
  }, []);

  /*
   * LOAD WORKSPACES
   *
   * This runs only after authentication.
   *
   * Important:
   * We do NOT convert API errors into [].
   *
   * A 401 (after refresh failure) means authentication failed.
   * An empty array means the authenticated user
   * genuinely has no workspaces.
   */
  const loadWorkspaces =
    useCallback(async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const workspaceList =
          await api.getWorkspaces();

        setWorkspaces(workspaceList);

        /*
         * STRICT UX:
         *
         * Do not automatically select workspaceList[0].
         *
         * Even if workspaces exist, WorkspaceGate
         * allows the user to explicitly select one.
         */
        setActiveWorkspace(null);

        setProjects([]);
        setActiveProject(null);
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          err.statusCode === 401
        ) {
          clearStoredTokens();

          setIsAuthenticated(false);

          setWorkspaces([]);
          setActiveWorkspace(null);

          setProjects([]);
          setActiveProject(null);

          setError(null);

          return;
        }

        console.error(
          "Error loading workspaces:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load workspaces.",
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  /*
   * LOAD PROJECTS
   *
   * Called only after the user has selected
   * a real workspace.
   */
  const loadProjects = useCallback(
    async (
      workspaceId: string,
    ): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        const projectList =
          await api.getProjects(workspaceId);

        setProjects(projectList);

        /*
         * Auto-select the first active (non-archived) project.
         * If no active project exists, open ProjectGate.
         */
        const activeProjects = projectList.filter(
          (p) => p.status !== "ARCHIVED",
        );

        if (activeProjects.length > 0) {
          setActiveProject(activeProjects[0]);
        } else {
          setActiveProject(null);
        }
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          err.statusCode === 401
        ) {
          clearStoredTokens();

          setIsAuthenticated(false);

          setWorkspaces([]);
          setActiveWorkspace(null);

          setProjects([]);
          setActiveProject(null);

          setError(null);

          return;
        }

        console.error(
          "Error loading projects:",
          err,
        );

        setProjects([]);
        setActiveProject(null);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load projects.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /*
   * INITIAL AUTHENTICATED LOAD
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    void loadWorkspaces();
  }, [
    isAuthenticated,
    loadWorkspaces,
  ]);

  /*
   * LOAD PROJECTS AFTER WORKSPACE SELECTION
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (!activeWorkspace) {
      return;
    }

    void loadProjects(activeWorkspace.id);
  }, [
    isAuthenticated,
    activeWorkspace,
    loadProjects,
  ]);

  /*
   * AUTH SUCCESS
   *
   * AuthGate calls this after api.login/register
   * has successfully stored the access token.
   */
  const handleAuthenticated = (): void => {
    setError(null);
    setIsAuthenticated(true);
  };

  /*
   * WORKSPACE SELECTION
   */
  const handleSelectWorkspace = (
    workspace: Workspace,
  ): void => {
    setError(null);

    setProjects([]);
    setActiveProject(null);

    setActiveWorkspace(workspace);
  };

  /*
   * WORKSPACE CREATED
   */
  const handleWorkspaceCreated = (
    workspace: Workspace,
  ): void => {
    setWorkspaces((current) => [
      ...current,
      workspace,
    ]);

    setProjects([]);
    setActiveProject(null);

    /*
     * Creation is an explicit user action,
     * so the newly created workspace becomes active.
     */
    setActiveWorkspace(workspace);
  };

  /*
   * PROJECT CREATED
   */
  const handleProjectCreated = (
    project: Project,
  ): void => {
    setProjects((current) => [
      ...current,
      project,
    ]);

    setActiveProject(project);
  };

  /*
   * PROJECT UPDATED (Status / Archive / Restore)
   */
  const handleProjectUpdated = (
    updatedProject: Project,
  ): void => {
    setProjects((current) =>
      current.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
    );

    // If the active project is archived, safely switch or clear selection
    if (activeProject?.id === updatedProject.id) {
      if (updatedProject.status === "ARCHIVED") {
        const remainingActive = projects.filter(
          (p) => p.id !== updatedProject.id && p.status !== "ARCHIVED",
        );
        setActiveProject(remainingActive.length > 0 ? remainingActive[0] : null);
      } else {
        setActiveProject(updatedProject);
      }
    }
  };

  /*
   * PROJECT DELETED
   */
  const handleProjectDeleted = (
    deletedProjectId: string,
  ): void => {
    setProjects((current) =>
      current.filter((p) => p.id !== deletedProjectId),
    );

    if (activeProject?.id === deletedProjectId) {
      const remainingActive = projects.filter(
        (p) => p.id !== deletedProjectId && p.status !== "ARCHIVED",
      );
      setActiveProject(remainingActive.length > 0 ? remainingActive[0] : null);
    }
  };

  /*
   * SWITCH WORKSPACE
   *
   * Returning activeWorkspace to null causes
   * WorkspaceGate to display the real workspace list.
   */
  const handleSwitchWorkspace = (): void => {
    setError(null);

    setProjects([]);
    setActiveProject(null);

    setActiveWorkspace(null);
  };

  /*
   * LOGOUT
   *
   * api.logout revokes the server session, clears tokens and fires the
   * auth-revoked event; the listener above resets all app state.
   */
  const handleLogout = async (): Promise<void> => {
    setError(null);
    await api.logout();
  };

  /*
   * GATE 0 — AUTHENTICATION
   */
  if (!isAuthenticated) {
    return (
      <AuthGate
        onAuthenticated={
          handleAuthenticated
        }
      />
    );
  }

  /*
   * LOADING
   */
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#ffffff] font-mono text-xs text-[#858585]">
        Loading...
      </div>
    );
  }

  /*
   * REAL API ERROR
   *
   * Do not pretend an API failure means
   * there are zero workspaces/projects.
   */
  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#ffffff] p-4 font-sans text-xs select-none">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#d5d9e2] bg-[#f9f8f6] p-6 shadow-sm">
          <div className="font-bold text-rose-700 text-sm font-mono uppercase tracking-wider">
            DevForge could not load
          </div>

          <div className="text-[#858585]">
            {error}
          </div>

          <button
            type="button"
            onClick={() => {
              void loadWorkspaces();
            }}
            className="rounded-full bg-[#0a0a0a] px-5 py-2 font-semibold text-white transition hover:bg-[#262626] shadow-xs"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /*
   * GATE 1 — WORKSPACE
   *
   * Zero workspaces:
   *   WorkspaceGate shows Create Workspace.
   *
   * Existing workspaces:
   *   WorkspaceGate shows Select Workspace.
   */
  if (!activeWorkspace) {
    return (
      <WorkspaceGate
        workspaces={workspaces}
        onSelectWorkspace={
          handleSelectWorkspace
        }
        onWorkspaceCreated={
          handleWorkspaceCreated
        }
      />
    );
  }

  /*
   * GATE 2 — PROJECT
   *
   * No projects:
   *   ProjectGate shows Create Project.
   *
   * A project is created/selected:
   *   continue to Work Stream.
   */
  if (
    projects.length === 0 ||
    !activeProject
  ) {
    return (
      <ProjectGate
        workspace={activeWorkspace}
        projects={projects}
        onSelectProject={
          setActiveProject
        }
        onProjectCreated={
          handleProjectCreated
        }
      />
    );
  }

  /*
   * GATE 3 — WORK STREAM
   */
  return (
    <AppShell
      workspace={activeWorkspace}
      projects={projects}
      activeProject={activeProject}
      onSelectProject={setActiveProject}
      onProjectCreated={handleProjectCreated}
      onProjectUpdated={handleProjectUpdated}
      onProjectDeleted={handleProjectDeleted}
      onSwitchWorkspace={handleSwitchWorkspace}
      onLogout={handleLogout}
    >
      <WorkStream
        workspace={activeWorkspace}
        project={activeProject}
      />
    </AppShell>
  );
};

export default App;