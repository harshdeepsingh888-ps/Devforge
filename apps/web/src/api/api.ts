import {
  apiFetch,
  setStoredToken,
} from "../services/api-client";

import type {
  Comment,
  Project,
  UpdateWorkItemInput,
  WorkItem,
  WorkItemHistory,
  WorkItemPriority,
  Workflow,
  WorkflowDetails,
  Workspace,
} from "../types/api.types";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticationResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const api = {
  /*
   * AUTH
   */

  async login(
    email: string,
    password: string,
  ): Promise<AuthenticationResult> {
    const result =
      await apiFetch<AuthenticationResult>(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

    setStoredToken(result.accessToken);

    return result;
  },

  async register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<AuthenticationResult> {
    const result =
      await apiFetch<AuthenticationResult>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
            displayName,
          }),
        },
      );

    setStoredToken(result.accessToken);

    return result;
  },

  /*
   * WORKSPACES
   */

  async getWorkspaces(): Promise<Workspace[]> {
    return apiFetch<Workspace[]>(
      "/api/workspaces",
    );
  },

  async createWorkspace(
    name: string,
  ): Promise<Workspace> {
    return apiFetch<Workspace>(
      "/api/workspaces",
      {
        method: "POST",
        body: JSON.stringify({
          name,
        }),
      },
    );
  },

  /*
   * PROJECTS
   */

  async getProjects(
    workspaceId: string,
  ): Promise<Project[]> {
    return apiFetch<Project[]>(
      `/api/workspaces/${workspaceId}/projects`,
    );
  },

  async createProject(
    workspaceId: string,
    name: string,
    description?: string,
  ): Promise<Project> {
    return apiFetch<Project>(
      `/api/workspaces/${workspaceId}/projects`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
        }),
      },
    );
  },

  /*
   * WORK ITEMS
   */

  async getWorkItems(
    workspaceId: string,
    projectId: string,
  ): Promise<WorkItem[]> {
    return apiFetch<WorkItem[]>(
      `/api/workspaces/${workspaceId}/projects/${projectId}/work-items`,
    );
  },

  async createWorkItem(
    workspaceId: string,
    projectId: string,
    title: string,
    priority?: WorkItemPriority,
  ): Promise<WorkItem> {
    return apiFetch<WorkItem>(
      `/api/workspaces/${workspaceId}/projects/${projectId}/work-items`,
      {
        method: "POST",
        body: JSON.stringify({
          type: "TASK",
          title,
          ...(priority ? { priority } : {}),
        }),
      },
    );
  },

  async deleteWorkItem(
    workspaceId: string,
    projectId: string,
    workItemId: string,
  ): Promise<void> {
    return apiFetch<void>(
      `/api/workspaces/${workspaceId}/projects/${projectId}/work-items/${workItemId}`,
      {
        method: "DELETE",
      },
    );
  },

  /*
   * WORKFLOWS & TRANSITIONS
   */

  async getWorkflows(workspaceId: string): Promise<Workflow[]> {
    return apiFetch<Workflow[]>(`/api/workspaces/${workspaceId}/workflows`);
  },

  async getWorkflowDetails(
    workspaceId: string,
    workflowId: string,
  ): Promise<WorkflowDetails> {
    return apiFetch<WorkflowDetails>(
      `/api/workspaces/${workspaceId}/workflows/${workflowId}`,
    );
  },

  async transitionWorkItem(
    workspaceId: string,
    workItemId: string,
    targetStateId: string,
  ): Promise<WorkItem> {
    return apiFetch<WorkItem>(
      `/api/workspaces/${workspaceId}/work-items/${workItemId}/transition`,
      {
        method: "POST",
        body: JSON.stringify({ targetStateId }),
      },
    );
  },

  /*
   * INSPECTOR & DETAILS
   */

  async updateWorkItem(
    workspaceId: string,
    workItemId: string,
    updates: UpdateWorkItemInput,
    projectId?: string,
  ): Promise<WorkItem> {
    const url = projectId
      ? `/api/workspaces/${workspaceId}/projects/${projectId}/work-items/${workItemId}`
      : `/api/workspaces/${workspaceId}/work-items/${workItemId}`;

    return apiFetch<WorkItem>(url, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async getComments(
    workspaceId: string,
    workItemId: string,
  ): Promise<Comment[]> {
    return apiFetch<Comment[]>(
      `/api/workspaces/${workspaceId}/work-items/${workItemId}/comments`,
    );
  },

  async addComment(
    workspaceId: string,
    workItemId: string,
    content: string,
  ): Promise<Comment> {
    return apiFetch<Comment>(
      `/api/workspaces/${workspaceId}/work-items/${workItemId}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ content }),
      },
    );
  },

  async getWorkItemHistory(
    workspaceId: string,
    workItemId: string,
  ): Promise<WorkItemHistory[]> {
    return apiFetch<WorkItemHistory[]>(
      `/api/workspaces/${workspaceId}/work-items/${workItemId}/history`,
    );
  },
};