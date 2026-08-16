import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceWithMembership,
} from "./workspace.types.js";

export interface WorkspaceRepository {
  create(
    input: CreateWorkspaceInput,
  ): Promise<Workspace>;

  findById(
    workspaceId: string,
  ): Promise<Workspace | null>;

  findBySlug(
    slug: string,
  ): Promise<Workspace | null>;

  findForUser(
    userId: string,
  ): Promise<WorkspaceWithMembership[]>;

  addMember(
    input: AddWorkspaceMemberInput,
  ): Promise<WorkspaceMember>;

  findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null>;

  removeMember(
    workspaceId: string,
    userId: string,
  ): Promise<boolean>;

  updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null>;
}