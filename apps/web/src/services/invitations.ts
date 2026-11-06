/*
 * Pure helpers for the invitation UI. No React, no fetch, so they are
 * testable under node --test like the other service modules.
 */

export type WorkspaceRole = "OWNER" | "ADMIN" | "DEVELOPER" | "VIEWER";

/** Raw tokens are 32 random bytes rendered as 64 lowercase hex characters. */
export const INVITATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

const INVITE_QUERY_PARAM = "invite";

/**
 * Accepts whatever the invitee pastes: the bare token, or a full invite
 * link carrying it as ?invite=. Returns null for anything else so the UI
 * can reject it before a request is made.
 */
export function extractInvitationToken(input: string): string | null {
  const trimmed = input.trim();

  if (INVITATION_TOKEN_PATTERN.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get(INVITE_QUERY_PARAM);
    if (fromQuery && INVITATION_TOKEN_PATTERN.test(fromQuery)) {
      return fromQuery;
    }
  } catch {
    // Not a URL; fall through.
  }

  return null;
}

/** The shareable link the inviter copies. The token is only ever in this link and the create response. */
export function buildInvitationLink(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/?${INVITE_QUERY_PARAM}=${token}`;
}

/** Reads a token from the page's query string (an opened invite link). */
export function readInvitationTokenFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const token = params.get(INVITE_QUERY_PARAM);
  return token && INVITATION_TOKEN_PATTERN.test(token) ? token : null;
}

/** Mirrors the server rule: only OWNER and ADMIN manage invitations. */
export function canManageInvitations(role: WorkspaceRole | undefined): boolean {
  return role === "OWNER" || role === "ADMIN";
}

/**
 * Mirrors the server rule: an ADMIN may not grant OWNER. The server still
 * enforces this; the list only keeps the form honest.
 */
export function invitableRoles(actorRole: WorkspaceRole | undefined): WorkspaceRole[] {
  if (actorRole === "OWNER") {
    return ["OWNER", "ADMIN", "DEVELOPER", "VIEWER"];
  }
  if (actorRole === "ADMIN") {
    return ["ADMIN", "DEVELOPER", "VIEWER"];
  }
  return [];
}

export function formatExpiry(expiresAt: string, now: Date = new Date()): string {
  const expires = new Date(expiresAt);
  const msLeft = expires.getTime() - now.getTime();

  if (Number.isNaN(msLeft)) return "unknown expiry";
  if (msLeft <= 0) return "expired";

  // Round to the nearest day so a fresh 7-day invitation reads "7 days", not "6".
  const days = Math.round(msLeft / 86_400_000);
  if (days >= 1) return `expires in ${days} day${days === 1 ? "" : "s"}`;

  const hours = Math.max(1, Math.ceil(msLeft / 3_600_000));
  return `expires in ${hours} hour${hours === 1 ? "" : "s"}`;
}
