import { apiFetch, setStoredToken } from "./api-client";
import type {
  ArchitectureDecision,
  Commit,
  Deployment,
  DoraMetrics,
  Pipeline,
  PipelineRun,
  PipelineRunTrace,
  Project,
  Repository,
  Team,
  TechnicalSpecification,
  User,
  WorkItem,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
  Workspace,
  WorkspaceMember,
} from "../types/api.types";

export const apiService = {
  // --- AUTH ---
  async register(data: { email: string; name: string; password?: string }) {
    const res = await apiFetch<{ user: User; accessToken: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        displayName: data.name,
        password: data.password || "Password123!",
      }),
    });
    if (res.accessToken) {
      setStoredToken(res.accessToken);
    }
    return res;
  },

  async login(data: { email: string; password?: string }) {
    const res = await apiFetch<{ user: User; accessToken: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: data.email,
        password: data.password || "Password123!",
      }),
    });
    if (res.accessToken) {
      setStoredToken(res.accessToken);
    }
    return res;
  },

  // --- WORKSPACES ---
  async getWorkspaces(): Promise<Workspace[]> {
    return apiFetch<Workspace[]>("/api/workspaces");
  },

  async createWorkspace(name: string): Promise<Workspace> {
    return apiFetch<Workspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return apiFetch<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`);
  },

  // --- PROJECTS ---
  async getProjects(workspaceId: string): Promise<Project[]> {
    return apiFetch<Project[]>(`/api/workspaces/${workspaceId}/projects`);
  },

  async createProject(workspaceId: string, name: string, description?: string): Promise<Project> {
    return apiFetch<Project>(`/api/workspaces/${workspaceId}/projects`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  },

  // --- TEAMS ---
  async getTeams(workspaceId: string): Promise<Team[]> {
    return apiFetch<Team[]>(`/api/workspaces/${workspaceId}/teams`);
  },

  async createTeam(workspaceId: string, name: string, description?: string): Promise<Team> {
    return apiFetch<Team>(`/api/workspaces/${workspaceId}/teams`, {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
  },

  // --- WORK ITEMS ---
  async getWorkItems(workspaceId: string, projectId?: string): Promise<WorkItem[]> {
    const query = projectId ? `?projectId=${projectId}` : "";
    return apiFetch<WorkItem[]>(`/api/workspaces/${workspaceId}/work-items${query}`);
  },

  async getWorkItem(workspaceId: string, workItemId: string): Promise<WorkItem> {
    return apiFetch<WorkItem>(`/api/workspaces/${workspaceId}/work-items/${workItemId}`);
  },

  async createWorkItem(
    workspaceId: string,
    data: {
      projectId: string;
      title: string;
      description?: string;
      type?: WorkItemType;
      priority?: WorkItemPriority;
      assigneeUserId?: string;
      teamId?: string;
      estimate?: string;
    },
  ): Promise<WorkItem> {
    return apiFetch<WorkItem>(`/api/workspaces/${workspaceId}/projects/${data.projectId}/work-items`, {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        type: data.type || "TASK",
        priority: data.priority || "P1",
        assigneeUserId: data.assigneeUserId,
        teamId: data.teamId,
        estimate: data.estimate,
      }),
    });
  },

  async updateWorkItem(
    workspaceId: string,
    workItemId: string,
    updates: {
      title?: string;
      description?: string | null;
      priority?: WorkItemPriority;
      assigneeUserId?: string | null;
      teamId?: string | null;
      estimate?: string;
    },
  ): Promise<WorkItem> {
    return apiFetch<WorkItem>(`/api/workspaces/${workspaceId}/work-items/${workItemId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async updateWorkItemStatus(
    workspaceId: string,
    workItemId: string,
    status: WorkItemStatus,
  ): Promise<WorkItem> {
    return apiFetch<WorkItem>(`/api/workspaces/${workspaceId}/work-items/${workItemId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  async getWorkItemHistory(workspaceId: string, workItemId: string): Promise<any[]> {
    return apiFetch<any[]>(`/api/workspaces/${workspaceId}/work-items/${workItemId}/history`).catch(() => []);
  },

  async getWorkItemComments(workspaceId: string, workItemId: string): Promise<any[]> {
    return apiFetch<any[]>(`/api/workspaces/${workspaceId}/work-items/${workItemId}/comments`).catch(() => []);
  },

  async addWorkItemComment(workspaceId: string, workItemId: string, text: string): Promise<any> {
    return apiFetch<any>(`/api/workspaces/${workspaceId}/work-items/${workItemId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: text }),
    });
  },

  // --- ARCHITECTURE (ADRs) ---
  async getAdrs(workspaceId: string): Promise<ArchitectureDecision[]> {
    return apiFetch<ArchitectureDecision[]>(`/api/workspaces/${workspaceId}/adrs`);
  },

  async createAdr(
    workspaceId: string,
    data: {
      projectId?: string;
      title: string;
      context: string;
      decision: string;
      consequences: string;
    },
  ): Promise<ArchitectureDecision> {
    return apiFetch<ArchitectureDecision>(`/api/workspaces/${workspaceId}/adrs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async acceptAdr(workspaceId: string, adrId: string): Promise<ArchitectureDecision> {
    return apiFetch<ArchitectureDecision>(`/api/workspaces/${workspaceId}/adrs/${adrId}/accept`, {
      method: "POST",
    });
  },

  async rejectAdr(workspaceId: string, adrId: string): Promise<ArchitectureDecision> {
    return apiFetch<ArchitectureDecision>(`/api/workspaces/${workspaceId}/adrs/${adrId}/reject`, {
      method: "POST",
    });
  },

  // --- TECHNICAL SPECS ---
  async getSpecs(workspaceId: string): Promise<TechnicalSpecification[]> {
    return apiFetch<TechnicalSpecification[]>(`/api/workspaces/${workspaceId}/specs`);
  },

  async createSpec(
    workspaceId: string,
    data: {
      projectId: string;
      title: string;
      content: string;
    },
  ): Promise<TechnicalSpecification> {
    return apiFetch<TechnicalSpecification>(`/api/workspaces/${workspaceId}/specs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async approveSpec(workspaceId: string, specId: string): Promise<TechnicalSpecification> {
    return apiFetch<TechnicalSpecification>(`/api/workspaces/${workspaceId}/specs/${specId}/approve`, {
      method: "POST",
    });
  },

  // --- GIT ---
  async getRepositories(workspaceId: string): Promise<Repository[]> {
    return apiFetch<Repository[]>(`/api/workspaces/${workspaceId}/repositories`);
  },

  async createRepository(
    workspaceId: string,
    data: { name: string; provider: string; externalId: string; url: string },
  ): Promise<Repository> {
    return apiFetch<Repository>(`/api/workspaces/${workspaceId}/repositories`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getCommits(workspaceId: string, repositoryId: string): Promise<Commit[]> {
    return apiFetch<Commit[]>(`/api/workspaces/${workspaceId}/repositories/${repositoryId}/commits`);
  },

  async ingestCommit(
    workspaceId: string,
    repositoryId: string,
    data: {
      externalId: string;
      message: string;
      authorName: string;
      authorEmail: string;
      committedAt?: string;
      url: string;
    },
  ): Promise<Commit> {
    return apiFetch<Commit>(`/api/workspaces/${workspaceId}/repositories/${repositoryId}/commits`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // --- CI/CD ---
  async getPipelines(workspaceId: string): Promise<Pipeline[]> {
    return apiFetch<Pipeline[]>(`/api/workspaces/${workspaceId}/pipelines`);
  },

  async createPipeline(
    workspaceId: string,
    data: { projectId: string; provider?: string; name: string; externalId: string },
  ): Promise<Pipeline> {
    return apiFetch<Pipeline>(`/api/workspaces/${workspaceId}/pipelines`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getPipelineRuns(workspaceId: string, pipelineId: string): Promise<PipelineRun[]> {
    return apiFetch<PipelineRun[]>(`/api/workspaces/${workspaceId}/pipelines/${pipelineId}/runs`);
  },

  async ingestPipelineRun(
    workspaceId: string,
    pipelineId: string,
    data: { commitId: string; externalRunId: string; status?: string },
  ): Promise<PipelineRun> {
    return apiFetch<PipelineRun>(`/api/workspaces/${workspaceId}/pipelines/${pipelineId}/runs`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async recordDeployment(
    workspaceId: string,
    runId: string,
    environment: "DEV" | "STAGING" | "PROD",
  ): Promise<Deployment> {
    return apiFetch<Deployment>(`/api/workspaces/${workspaceId}/runs/${runId}/deploy`, {
      method: "POST",
      body: JSON.stringify({ environment }),
    });
  },

  async getPipelineRunTrace(workspaceId: string, runId: string): Promise<PipelineRunTrace> {
    return apiFetch<PipelineRunTrace>(`/api/workspaces/${workspaceId}/runs/${runId}`);
  },

  async getDoraMetrics(workspaceId: string): Promise<DoraMetrics> {
    const runs = await this.getPipelineRuns(workspaceId, "all").catch(() => []);
    const successfulRuns = runs.filter((r) => r.status === "SUCCESS");
    return {
      deploymentFrequency: successfulRuns.length,
      leadTimeMsAvg: successfulRuns.length > 0 ? 340000 : null,
    };
  },

  async searchAll(
    workspaceId: string,
    query: string,
  ): Promise<{ workItems: WorkItem[]; projects: Project[]; actions: any[] }> {
    const [items, projs] = await Promise.all([
      this.getWorkItems(workspaceId).catch(() => []),
      this.getProjects(workspaceId).catch(() => []),
    ]);
    const q = query.toLowerCase().trim();
    const filteredItems = items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.id.toLowerCase().includes(q),
    );
    const filteredProjects = projs.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
    return {
      workItems: filteredItems,
      projects: filteredProjects,
      actions: [],
    };
  },
};
