import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import { api } from "./api/api";
import {
  getStoredToken,
  setStoredToken,
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
   * The access token is stored by api.login/api.register.
   * If there is no token, AuthGate is the first screen.
   */
  const [isAuthenticated, setIsAuthenticated] =
    useState<boolean>(() => Boolean(getStoredToken()));

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
      Boolean(getStoredToken()),
    );

  const [error, setError] = useState<
    string | null
  >(null);

  /*
   * LOAD WORKSPACES
   *
   * This runs only after authentication.
   *
   * Important:
   * We do NOT convert API errors into [].
   *
   * A 401 means authentication failed.
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
        /*
         * apiFetch removes the stored token when
         * the backend returns 401.
         */
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err &&
          err.statusCode === 401
        ) {
          setStoredToken(null);

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
         * Current Phase 1 behavior:
         *
         * If projects exist, open the first project.
         *
         * If none exist, ProjectGate will provide
         * the Create Project flow.
         */
        if (projectList.length > 0) {
          setActiveProject(projectList[0]);
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
          setStoredToken(null);

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
      <div className="flex h-screen w-screen items-center justify-center bg-[#050706] font-mono text-xs text-emerald-400">
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
      <div className="flex h-screen w-screen items-center justify-center bg-[#050706] p-4 font-mono text-xs">
        <div className="w-full max-w-md space-y-4 border border-rose-500/30 bg-[#080a09] p-6">
          <div className="font-bold text-rose-400">
            DevForge could not load
          </div>

          <div className="text-zinc-400">
            {error}
          </div>

          <button
            type="button"
            onClick={() => {
              void loadWorkspaces();
            }}
            className="bg-emerald-500 px-4 py-2 font-bold text-black transition-colors hover:bg-emerald-600"
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
      onSwitchWorkspace={handleSwitchWorkspace}
    >
      <WorkStream
        workspace={activeWorkspace}
        project={activeProject}
      />
    </AppShell>
  );
};

export default App;