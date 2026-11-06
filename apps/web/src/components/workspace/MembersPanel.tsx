import React, { useCallback, useEffect, useState } from "react";

import { api } from "../../api/api";
import {
  buildInvitationLink,
  canManageInvitations,
  formatExpiry,
  invitableRoles,
} from "../../services/invitations";
import {
  canLeaveWorkspace,
  canRemoveMember,
  roleOptionsFor,
} from "../../services/members";
import type {
  CreatedInvitation,
  Workspace,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceRole,
} from "../../types/api.types";

interface MembersPanelProps {
  workspace: Workspace;
  onClose: () => void;
  /** The current user is no longer a member; the app returns to the workspace gate. */
  onLeave: () => void;
  /** The current user changed their own role; the app keeps its copy in step. */
  onOwnRoleChanged: (role: WorkspaceRole) => void;
}

const inputClass =
  "w-full rounded-lg border border-[#d5d9e2] dark:border-white/10 bg-white dark:bg-[#161514] px-3 py-1.5 text-xs text-[#0a0a0a] dark:text-white placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] dark:focus:border-white/40 font-sans";

const labelClass =
  "block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#858585] dark:text-[#78756f]";

const secondaryButtonClass =
  "rounded-lg border border-[#d5d9e2] dark:border-white/[0.08] bg-white dark:bg-[#161514] px-2.5 py-1 text-[11px] font-medium text-[#0a0a0a] dark:text-[#9e9a93] transition hover:border-[#0a0a0a] dark:hover:border-white/20 hover:bg-[#f2ede5] dark:hover:bg-[#1a1918] disabled:cursor-not-allowed disabled:opacity-40";

const dangerButtonClass =
  "rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40";

const roleBadgeClass =
  "shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#737373] dark:text-[#88857f]";

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/**
 * Workspace members and invitations. Everyone sees members and may leave;
 * OWNER and ADMIN also change roles, remove members and manage
 * invitations. The server enforces every rule; the checks here only decide
 * what to render.
 */
export const MembersPanel: React.FC<MembersPanelProps> = ({
  workspace,
  onClose,
  onLeave,
  onOwnRoleChanged,
}) => {
  const role = workspace.membership?.role;
  const selfUserId = workspace.membership?.userId;
  const canManage = canManageInvitations(role);

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);

  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("DEVELOPER");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedInvitation | null>(null);
  const [copied, setCopied] = useState(false);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [memberList, invitationList] = await Promise.all([
        api.getWorkspaceMembers(workspace.id),
        canManage ? api.getInvitations(workspace.id) : Promise.resolve([]),
      ]);
      setMembers(memberList);
      setInvitations(invitationList);
    } catch (err) {
      setLoadError(errorMessage(err, "Failed to load members."));
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id, canManage]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleRoleChange = async (member: WorkspaceMember, nextRole: WorkspaceRole) => {
    if (busyUserId || nextRole === member.role) return;
    setBusyUserId(member.userId);
    setMemberError(null);
    setConfirmRemoveUserId(null);
    try {
      const updated = await api.updateMemberRole(workspace.id, member.userId, nextRole);
      setMembers((current) =>
        current.map((item) =>
          item.userId === updated.userId ? { ...item, role: updated.role } : item,
        ),
      );
      if (updated.userId === selfUserId) onOwnRoleChanged(updated.role);
    } catch (err) {
      setMemberError(errorMessage(err, "Failed to change role."));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (member: WorkspaceMember) => {
    if (busyUserId) return;
    setBusyUserId(member.userId);
    setMemberError(null);
    try {
      await api.removeMember(workspace.id, member.userId);
      setMembers((current) => current.filter((item) => item.userId !== member.userId));
      setConfirmRemoveUserId(null);
    } catch (err) {
      setMemberError(errorMessage(err, "Failed to remove member."));
    } finally {
      setBusyUserId(null);
    }
  };

  const handleLeave = async () => {
    if (isLeaving || !selfUserId) return;
    setIsLeaving(true);
    setLeaveError(null);
    try {
      await api.removeMember(workspace.id, selfUserId);
      onLeave();
    } catch (err) {
      setLeaveError(errorMessage(err, "Failed to leave workspace."));
      setIsLeaving(false);
    }
  };

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email || isInviting) return;

    setIsInviting(true);
    setInviteError(null);
    setCreated(null);
    setCopied(false);

    try {
      const result = await api.createInvitation(workspace.id, { email, role: inviteRole });
      setCreated(result);
      setInvitations((current) => [result.invitation, ...current]);
      setInviteEmail("");
    } catch (err) {
      setInviteError(errorMessage(err, "Failed to create invitation."));
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!created) return;
    const link = buildInvitationLink(window.location.origin, created.token);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const handleRevoke = async (invitation: WorkspaceInvitation) => {
    if (revokingId) return;
    setRevokingId(invitation.id);
    setRevokeError(null);
    try {
      const revoked = await api.revokeInvitation(workspace.id, invitation.id);
      setInvitations((current) =>
        current.map((item) => (item.id === revoked.id ? revoked : item)),
      );
      if (created?.invitation.id === revoked.id) setCreated(null);
    } catch (err) {
      setRevokeError(errorMessage(err, "Failed to revoke invitation."));
    } finally {
      setRevokingId(null);
    }
  };

  const pending = invitations.filter((item) => item.status === "PENDING");
  const settled = invitations.filter((item) => item.status !== "PENDING");
  const roleOptions = invitableRoles(role);
  const mayLeave = !isLoading && canLeaveWorkspace(selfUserId, members);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="members-panel-title"
      className="flex h-full flex-col bg-white dark:bg-[#111110] text-[#0a0a0a] dark:text-white font-sans"
    >
      {/* HEADER */}
      <div className="flex items-start justify-between border-b border-[#d5d9e2] dark:border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#858585] dark:text-[#78756f]">
            {workspace.name}
          </div>
          <h2 id="members-panel-title" className="mt-0.5 text-sm font-semibold">
            Members
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close members panel"
          className="rounded-md px-2 py-0.5 text-sm text-[#737373] dark:text-[#88857f] hover:bg-[#f2ede5] dark:hover:bg-[#161514] hover:text-[#0a0a0a] dark:hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-6 text-xs">
        {loadError && (
          <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-700">
            {loadError}{" "}
            <button type="button" onClick={() => void load()} className="underline">
              Retry
            </button>
          </div>
        )}

        {/* MEMBERS */}
        <section aria-labelledby="members-list-heading">
          <h3 id="members-list-heading" className={labelClass}>
            Members · {members.length}
          </h3>
          {memberError && (
            <div role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
              {memberError}
            </div>
          )}
          {isLoading ? (
            <p className="mt-2 text-[#858585]">Loading…</p>
          ) : (
            <ul className="mt-2 divide-y divide-[#f2ede5] dark:divide-white/[0.06]">
              {members.map((member) => {
                const isSelf = member.userId === selfUserId;
                const options = canManage ? roleOptionsFor(role, member, members) : [];
                const removable = canManage && canRemoveMember(role, selfUserId, member, members);
                const isBusy = busyUserId === member.userId;
                const isConfirmingRemove = confirmRemoveUserId === member.userId;
                const name = member.user.displayName;

                return (
                  <li key={member.userId} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {name}
                        {isSelf && (
                          <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-[#858585]">
                            you
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-[#858585]">{member.user.email}</div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {options.length > 0 ? (
                        <>
                          <label htmlFor={`member-role-${member.userId}`} className="sr-only">
                            Role for {name}
                          </label>
                          <select
                            id={`member-role-${member.userId}`}
                            value={member.role}
                            onChange={(event) =>
                              void handleRoleChange(member, event.target.value as WorkspaceRole)
                            }
                            disabled={busyUserId !== null}
                            className={`${inputClass} w-auto py-1 font-mono text-[10px] uppercase tracking-wider`}
                          >
                            {options.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </>
                      ) : (
                        <span className={roleBadgeClass}>{member.role}</span>
                      )}

                      {removable &&
                        (isConfirmingRemove ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleRemove(member)}
                              disabled={busyUserId !== null}
                              aria-label={`Confirm removing ${name}`}
                              className={dangerButtonClass}
                            >
                              {isBusy ? "Removing…" : "Confirm"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRemoveUserId(null)}
                              disabled={busyUserId !== null}
                              aria-label={`Cancel removing ${name}`}
                              className={secondaryButtonClass}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setMemberError(null);
                              setConfirmRemoveUserId(member.userId);
                            }}
                            disabled={busyUserId !== null}
                            aria-label={`Remove ${name} from the workspace`}
                            className={secondaryButtonClass}
                          >
                            Remove
                          </button>
                        ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {canManage && (
          <>
            {/* INVITE FORM */}
            <section aria-labelledby="invite-heading" className="border-t border-[#d5d9e2] dark:border-white/[0.06] pt-4">
              <h3 id="invite-heading" className={labelClass}>
                Invite someone
              </h3>
              <form onSubmit={handleInvite} className="mt-2 space-y-2">
                <div>
                  <label htmlFor="invite-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(event) => {
                      setInviteEmail(event.target.value);
                      if (inviteError) setInviteError(null);
                    }}
                    placeholder="name@company.com"
                    autoComplete="off"
                    disabled={isInviting}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="invite-role" className="sr-only">
                    Role
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
                    disabled={isInviting}
                    className={inputClass}
                  >
                    {roleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting || !inviteEmail.trim()}
                    className="shrink-0 rounded-lg bg-[#0a0a0a] dark:bg-[#f2ede5] px-3 py-1.5 text-xs font-semibold text-white dark:text-[#0a0a0a] transition hover:bg-[#262626] dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isInviting ? "Inviting…" : "Invite"}
                  </button>
                </div>
                {inviteError && (
                  <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
                    {inviteError}
                  </div>
                )}
              </form>

              {created && (
                <div
                  role="status"
                  className="mt-3 rounded-lg border border-[#d5d9e2] dark:border-white/10 bg-[#f9f8f6] dark:bg-[#161514] p-3 space-y-2"
                >
                  <div className="font-medium">
                    Invitation for {created.invitation.email} as {created.invitation.role}
                  </div>
                  <p className="text-[11px] text-[#737373] dark:text-[#88857f]">
                    Share this link with them. It is shown once and cannot be retrieved later;
                    only the account registered with that email can use it.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={buildInvitationLink(window.location.origin, created.token)}
                      aria-label="Invitation link"
                      onFocus={(event) => event.currentTarget.select()}
                      className={`${inputClass} font-mono select-text`}
                    />
                    <button type="button" onClick={() => void handleCopyLink()} className={secondaryButtonClass}>
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* PENDING INVITATIONS */}
            <section aria-labelledby="pending-heading" className="border-t border-[#d5d9e2] dark:border-white/[0.06] pt-4">
              <h3 id="pending-heading" className={labelClass}>
                Pending invitations · {pending.length}
              </h3>
              {revokeError && (
                <div role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
                  {revokeError}
                </div>
              )}
              {!isLoading && pending.length === 0 ? (
                <p className="mt-2 text-[#858585]">No pending invitations.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#f2ede5] dark:divide-white/[0.06]">
                  {pending.map((invitation) => (
                    <li key={invitation.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{invitation.email}</div>
                        <div className="text-[11px] text-[#858585]">
                          {invitation.role} · {formatExpiry(invitation.expiresAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRevoke(invitation)}
                        disabled={revokingId !== null}
                        aria-label={`Revoke invitation for ${invitation.email}`}
                        className={secondaryButtonClass}
                      >
                        {revokingId === invitation.id ? "Revoking…" : "Revoke"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {settled.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[11px] text-[#737373] dark:text-[#88857f]">
                    History · {settled.length}
                  </summary>
                  <ul className="mt-1 divide-y divide-[#f2ede5] dark:divide-white/[0.06]">
                    {settled.map((invitation) => (
                      <li key={invitation.id} className="flex items-center justify-between gap-3 py-1.5 text-[11px]">
                        <span className="truncate">{invitation.email}</span>
                        <span className="shrink-0 font-mono uppercase tracking-wider text-[#858585]">
                          {invitation.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          </>
        )}

        {/* LEAVE WORKSPACE */}
        {!isLoading && selfUserId && (
          <section aria-labelledby="leave-heading" className="border-t border-[#d5d9e2] dark:border-white/[0.06] pt-4">
            <h3 id="leave-heading" className={labelClass}>
              Leave workspace
            </h3>
            {leaveError && (
              <div role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-rose-700">
                {leaveError}
              </div>
            )}
            {mayLeave ? (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-[#737373] dark:text-[#88857f]">
                  You will lose access to {workspace.name}, its teams and your assignments
                  there. An OWNER or ADMIN can invite you back.
                </p>
                {isConfirmingLeave ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleLeave()}
                      disabled={isLeaving}
                      className={dangerButtonClass}
                    >
                      {isLeaving ? "Leaving…" : "Confirm leave"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingLeave(false)}
                      disabled={isLeaving}
                      className={secondaryButtonClass}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setLeaveError(null);
                      setIsConfirmingLeave(true);
                    }}
                    className={dangerButtonClass}
                  >
                    Leave workspace
                  </button>
                )}
              </div>
            ) : (
              <p className="mt-2 text-[11px] text-[#737373] dark:text-[#88857f]">
                You are the only OWNER. Make someone else an OWNER before leaving.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
