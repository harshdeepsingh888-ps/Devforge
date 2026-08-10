import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
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

  findMembership(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null>;

  listMemberships(
    workspaceId: string,
  ): Promise<WorkspaceMember[]>;

  addMember(
    input: AddWorkspaceMemberInput,
  ): Promise<WorkspaceMember>;

  updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null>;

  removeMember(
    workspaceId: string,
    userId: string,
  ): Promise<boolean>;
}