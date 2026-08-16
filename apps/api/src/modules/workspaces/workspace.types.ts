export const WORKSPACE_ROLES = [
  "OWNER",
  "ADMIN",
  "DEVELOPER",
  "VIEWER",
] as const;

export type WorkspaceRole =
  (typeof WORKSPACE_ROLES)[number];

export const WORKSPACE_ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  DEVELOPER: 2,
  VIEWER: 1,
};

export function hasMinimumRole(
  userRole: WorkspaceRole,
  requiredRole: WorkspaceRole,
): boolean {
  return (
    WORKSPACE_ROLE_HIERARCHY[userRole] >=
    WORKSPACE_ROLE_HIERARCHY[requiredRole]
  );
}

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