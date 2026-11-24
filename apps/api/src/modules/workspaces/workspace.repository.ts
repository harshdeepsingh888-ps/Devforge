import type {
  AddWorkspaceMemberInput,
  CreateWorkspaceInput,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberWithUser,
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

  /**
   * Removes the membership together with the member's footprint in that
   * workspace: their TeamMember rows for the workspace's teams and the
   * assignee of their work items there. All of it happens atomically, so a
   * removed member never lingers on a team or a ticket. Resolves false when
   * there was no membership. Throws WorkspaceOwnerRequiredError, with
   * nothing written, if the removal would leave the workspace without an
   * OWNER.
   */
  removeMember(
    workspaceId: string,
    userId: string,
  ): Promise<boolean>;

  /**
   * Resolves null when there is no membership. Throws
   * WorkspaceOwnerRequiredError, with nothing written, if the change would
   * demote the workspace's only OWNER.
   */
  updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null>;

  countMembersWithRole(
    workspaceId: string,
    role: WorkspaceRole,
  ): Promise<number>;

  listMemberships(
    workspaceId: string,
  ): Promise<WorkspaceMemberWithUser[]>;
}
