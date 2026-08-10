export const WORKSPACE_ROLES = [
  "OWNER",
  "MEMBER",
] as const;

export type WorkspaceRole =
  (typeof WORKSPACE_ROLES)[number];

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceWithMembership
  extends Workspace {
  membership: WorkspaceMember;
}

export interface CreateWorkspaceInput {
  name: string;
  slug: string;
}

export interface AddWorkspaceMemberInput {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}