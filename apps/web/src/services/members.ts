/*
 * Pure helpers for the member management UI. They mirror the server's
 * rules so the panel only offers actions that can succeed; the server
 * remains the authority and rejects anything these get wrong.
 */

import type { WorkspaceRole } from "./invitations";

export type { WorkspaceRole };

export interface MemberLike {
  userId: string;
  role: WorkspaceRole;
}

export const ALL_ROLES: readonly WorkspaceRole[] = ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"];

export function countOwners(members: readonly MemberLike[]): number {
  return members.filter((member) => member.role === "OWNER").length;
}

/** True when this member is the workspace's only OWNER, who can neither be demoted nor removed. */
export function isLastOwner(member: MemberLike, members: readonly MemberLike[]): boolean {
  return member.role === "OWNER" && countOwners(members) === 1;
}

/**
 * Roles the actor may assign to the target, including the target's current
 * role so a select can show it. Empty when the actor may not change this
 * member at all: DEVELOPER and VIEWER never may, an ADMIN may not touch an
 * OWNER, and nobody may demote the last OWNER.
 */
export function roleOptionsFor(
  actorRole: WorkspaceRole | undefined,
  target: MemberLike,
  members: readonly MemberLike[],
): WorkspaceRole[] {
  if (isLastOwner(target, members)) {
    return [];
  }

  if (actorRole === "OWNER") {
    return [...ALL_ROLES];
  }

  if (actorRole === "ADMIN" && target.role !== "OWNER") {
    return ["ADMIN", "DEVELOPER", "VIEWER"];
  }

  return [];
}

/**
 * Whether the actor may remove another member. Self-removal is leaving,
 * handled by canLeaveWorkspace, so this is false for the actor's own row.
 */
export function canRemoveMember(
  actorRole: WorkspaceRole | undefined,
  actorUserId: string | undefined,
  target: MemberLike,
  members: readonly MemberLike[],
): boolean {
  if (!actorUserId || target.userId === actorUserId) {
    return false;
  }

  if (isLastOwner(target, members)) {
    return false;
  }

  if (actorRole === "OWNER") {
    return true;
  }

  if (actorRole === "ADMIN") {
    return target.role === "DEVELOPER" || target.role === "VIEWER";
  }

  return false;
}

/** Any member may leave, except the last OWNER. Unknown members cannot leave. */
export function canLeaveWorkspace(
  actorUserId: string | undefined,
  members: readonly MemberLike[],
): boolean {
  const self = members.find((member) => member.userId === actorUserId);

  if (!self) {
    return false;
  }

  return !isLastOwner(self, members);
}
