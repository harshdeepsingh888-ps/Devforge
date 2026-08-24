import React, { useEffect, useState } from "react";
import { api } from "../../api/api";
import type {
  Comment,
  Project,
  Team,
  WorkItem,
  WorkItemHistory,
  WorkItemPriority,
  WorkflowDetails,
  Workspace,
  WorkspaceMember,
} from "../../types/api.types";

interface WorkItemInspectorProps {
  item: WorkItem;
  workspace: Workspace;
  project: Project;
  workflowDetails: WorkflowDetails | null;
  allItems: WorkItem[];
  members?: WorkspaceMember[];
  teams?: Team[];
  onClose: () => void;
  onItemUpdated: (updatedItem: WorkItem) => void;
  onTransitionState: (item: WorkItem, targetStateId: string) => Promise<void>;
  onDeleteRequest: (item: WorkItem) => void;
  onTeamCreated?: (team: Team) => void;
}

const PRIORITY_OPTIONS: {
  value: WorkItemPriority;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "LOW",
    label: "Low",
    badgeClass: "border-slate-600/40 bg-slate-800/30 text-slate-400",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  {
    value: "HIGH",
    label: "High",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  {
    value: "URGENT",
    label: "Urgent",
    badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  },
];

export const WorkItemInspector: React.FC<WorkItemInspectorProps> = ({
  item,
  workspace,
  project,
  workflowDetails,
  allItems,
  members = [],
  teams = [],
  onClose,
  onItemUpdated,
  onTransitionState,
  onDeleteRequest,
  onTeamCreated,
}) => {
  // EDITABLE STATE
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [storyPointsStr, setStoryPointsStr] = useState(
    item.storyPoints != null ? String(item.storyPoints) : "",
  );

  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isSavingPriority, setIsSavingPriority] = useState(false);
  const [isSavingStoryPoints, setIsSavingStoryPoints] = useState(false);
  const [isSavingAssignee, setIsSavingAssignee] = useState(false);
  const [isSavingTeam, setIsSavingTeam] = useState(false);
  const [isTransitioningStatus, setIsTransitioningStatus] = useState(false);

  // INLINE TEAM CREATION STATE
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [isSubmittingTeam, setIsSubmittingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // COMMENTS & HISTORY STATE
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentContent, setNewCommentContent] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);

  const [history, setHistory] = useState<WorkItemHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [activeTab, setActiveTab] = useState<"DETAILS" | "COMMENTS" | "HISTORY">("DETAILS");
  const [error, setError] = useState<string | null>(null);

  const role = workspace.membership?.role;
  const isViewer = role === "VIEWER";
  const canCreateTeam = role === "OWNER" || role === "ADMIN";

  // SYNC PROPS TO LOCAL STATE ON ITEM CHANGE
  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description || "");
    setStoryPointsStr(item.storyPoints != null ? String(item.storyPoints) : "");
    setError(null);
    setIsCreatingTeam(false);
    setNewTeamName("");
    setTeamError(null);
  }, [item.id, item.title, item.description, item.storyPoints]);

  // LISTEN FOR ESCAPE KEY TO CLOSE INSPECTOR
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCreatingTeam) {
          setIsCreatingTeam(false);
          setTeamError(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isCreatingTeam]);

  // LOAD COMMENTS & HISTORY WHEN ITEM CHANGES
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoadingComments(true);
      setIsLoadingHistory(true);

      try {
        const [cList, hList] = await Promise.allSettled([
          api.getComments(workspace.id, item.id),
          api.getWorkItemHistory(workspace.id, item.id),
        ]);

        if (isMounted) {
          if (cList.status === "fulfilled") setComments(cList.value);
          if (hList.status === "fulfilled") setHistory(hList.value);
        }
      } catch {
        // silent fail fallback
      } finally {
        if (isMounted) {
          setIsLoadingComments(false);
          setIsLoadingHistory(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [workspace.id, item.id]);

  // TITLE SAVE
  const handleSaveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === item.title || isSavingTitle || isViewer) return;

    setIsSavingTitle(true);
    setError(null);

    try {
      const updated = await api.updateWorkItem(
        workspace.id,
        item.id,
        { title: trimmed },
        project.id,
      );
      onItemUpdated(updated);
    } catch (err) {
      setTitle(item.title);
      setError(err instanceof Error ? err.message : "Failed to update title");
    } finally {
      setIsSavingTitle(false);
    }
  };

  // DESCRIPTION SAVE
  const handleSaveDescription = async () => {
    const trimmed = description.trim();
    const currentDesc = item.description || "";
    if (trimmed === currentDesc || isSavingDesc || isViewer) return;

    setIsSavingDesc(true);
    setError(null);

    try {
      const updated = await api.updateWorkItem(
        workspace.id,
        item.id,
        { description: trimmed || null },
        project.id,
      );
      onItemUpdated(updated);
    } catch (err) {
      setDescription(item.description || "");
      setError(
        err instanceof Error ? err.message : "Failed to update description",
      );
    } finally {
      setIsSavingDesc(false);
    }
  };

  // PRIORITY CHANGE
  const handlePriorityChange = async (newPriority: WorkItemPriority) => {
    if (newPriority === item.priority || isSavingPriority || isViewer) return;

    setIsSavingPriority(true);
    setError(null);

    try {
      const updated = await api.updateWorkItem(
        workspace.id,
        item.id,
        { priority: newPriority },
        project.id,
      );
      onItemUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update priority",
      );
    } finally {
      setIsSavingPriority(false);
    }
  };

  // STORY POINTS SAVE
  const handleSaveStoryPoints = async () => {
    if (isViewer) return;
    const trimmed = storyPointsStr.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (isNaN(parsed as number)) {
      setError("Story points must be a valid number");
      setStoryPointsStr(item.storyPoints != null ? String(item.storyPoints) : "");
      return;
    }

    if (parsed === item.storyPoints || isSavingStoryPoints) return;

    setIsSavingStoryPoints(true);
    setError(null);

    try {
      const updated = await api.updateWorkItem(
        workspace.id,
        item.id,
        { storyPoints: parsed },
        project.id,
      );
      onItemUpdated(updated);
    } catch (err) {
      setStoryPointsStr(item.storyPoints != null ? String(item.storyPoints) : "");
      setError(
        err instanceof Error ? err.message : "Failed to update story points",
      );
    } finally {
      setIsSavingStoryPoints(false);
    }
  };

  // ASSIGNEE CHANGE
  const handleAssigneeChange = async (newUserId: string | null) => {
    if (newUserId === item.assigneeUserId || isSavingAssignee || isViewer) return;

    setIsSavingAssignee(true);
    setError(null);

    try {
      const updated = await api.updateWorkItem(
        workspace.id,
        item.id,
        { assigneeUserId: newUserId },
        project.id,
      );
      onItemUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update assignee.",
      );
    } finally {
      setIsSavingAssignee(false);
    }
  };

  // TEAM CHANGE
  const handleTeamChange = async (newTeamId: string | null) => {
    if (newTeamId === item.teamId || isSavingTeam || isViewer) return;

    setIsSavingTeam(true);
    setError(null);

    try {
      const updated = await api.updateWorkItem(
        workspace.id,
        item.id,
        { teamId: newTeamId },
        project.id,
      );
      onItemUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update team.",
      );
    } finally {
      setIsSavingTeam(false);
    }
  };

  // CREATE TEAM SUBMIT & AUTO-ASSIGNMENT (STEP 5 & STEP 6)
  const handleCreateTeamSubmit = async () => {
    const trimmedName = newTeamName.trim();
    if (!trimmedName || isSubmittingTeam || !canCreateTeam) return;

    setIsSubmittingTeam(true);
    setTeamError(null);
    setError(null);

    let createdTeam: Team | null = null;

    try {
      createdTeam = await api.createTeam(workspace.id, trimmedName);
      if (onTeamCreated) {
        onTeamCreated(createdTeam);
      }
      setIsCreatingTeam(false);
      setNewTeamName("");
    } catch (err) {
      setTeamError(
        err instanceof Error ? err.message : "Could not create team.",
      );
      setIsSubmittingTeam(false);
      return;
    }

    setIsSubmittingTeam(false);

    // Auto-assign newly created team to the selected work item
    if (createdTeam) {
      try {
        const updated = await api.updateWorkItem(
          workspace.id,
          item.id,
          { teamId: createdTeam.id },
          project.id,
        );
        onItemUpdated(updated);
      } catch (err) {
        setError("Team created, but could not assign it to this work item.");
      }
    }
  };

  // STATUS TRANSITION
  const handleStatusChange = async (targetStateId: string) => {
    if (targetStateId === item.workflowStateId || isTransitioningStatus || isViewer) return;

    setIsTransitioningStatus(true);
    setError(null);

    try {
      await onTransitionState(item, targetStateId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to transition state",
      );
    } finally {
      setIsTransitioningStatus(false);
    }
  };

  // ADD COMMENT
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newCommentContent.trim();
    if (!content || isAddingComment || isViewer) return;

    setIsAddingComment(true);
    try {
      const created = await api.addComment(workspace.id, item.id, content);
      setComments((prev) => [...prev, created]);
      setNewCommentContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setIsAddingComment(false);
    }
  };

  // RESOLVE WORKFLOW STATES & TRANSITIONS
  const currentStateObj = workflowDetails?.states.find(
    (s) => s.id === item.workflowStateId,
  );

  const allowedTransitions = workflowDetails
    ? workflowDetails.transitions.filter(
        (t) => t.fromStateId === item.workflowStateId,
      )
    : [];

  const allowedTargetStates = workflowDetails
    ? workflowDetails.states.filter((s) =>
        allowedTransitions.some((t) => t.toStateId === s.id),
      )
    : [];

  const parentItem = item.parentId
    ? allItems.find((i) => i.id === item.parentId)
    : null;

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#161a18] bg-[#080a09] font-mono text-xs text-[#e5e7eb] select-none">
      {/* HEADER BAR */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#161a18] px-4">
        <div className="flex items-center gap-2">
          <span className="rounded border border-[#202622] bg-[#0b0f0d] px-1.5 py-0.5 text-[10px] font-bold text-[#9ca3af]">
            {item.type || "TASK"}
          </span>

          <span className="text-[10px] text-[#6b7280]">
            INSPECTOR
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-base text-[#9ca3af] hover:bg-[#161a18] hover:text-white"
          title="Close Inspector (Esc)"
        >
          ×
        </button>
      </div>

      {/* ERROR NOTIFICATION */}
      {error && (
        <div className="m-3 rounded border border-red-500/40 bg-red-500/10 p-2.5 text-[11px] text-red-300">
          {error}
        </div>
      )}

      {/* CONTENT SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TITLE FIELD */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
            }}
            disabled={isSavingTitle || isViewer}
            className="w-full rounded border border-transparent bg-transparent font-sans text-sm font-semibold text-white outline-none transition hover:border-[#202622] focus:border-emerald-500 focus:bg-[#050706] focus:px-2 focus:py-1 disabled:opacity-60"
          />
        </div>

        {/* DESCRIPTION FIELD */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#6b7280]">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleSaveDescription}
            placeholder="No description provided. Click to add details..."
            disabled={isSavingDesc || isViewer}
            className="w-full rounded border border-[#202622] bg-[#050706] p-2.5 font-sans text-xs text-[#e5e7eb] placeholder:text-[#525d6b] outline-none transition focus:border-emerald-500 disabled:opacity-60"
          />
        </div>

        {/* METADATA GRID / TABLE */}
        <div className="border-t border-[#161a18] pt-4 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6b7280]">
            Properties
          </div>

          {/* STATUS ROW */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] text-[#9ca3af]">STATUS</span>
            {allowedTargetStates.length > 0 && !isViewer ? (
              <select
                value={item.workflowStateId || ""}
                disabled={isTransitioningStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded border border-[#202622] bg-[#050706] px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value={item.workflowStateId || ""} disabled>
                  {currentStateObj ? currentStateObj.name : "Select status"}
                </option>
                {allowedTargetStates.map((s) => (
                  <option key={s.id} value={s.id}>
                    &rarr; {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded border border-[#202622] bg-[#0b0f0d] px-2 py-0.5 text-xs text-white">
                {currentStateObj ? currentStateObj.name : "Unknown"}
              </span>
            )}
          </div>

          {/* PRIORITY ROW */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] text-[#9ca3af]">PRIORITY</span>
            <select
              value={item.priority || "MEDIUM"}
              disabled={isSavingPriority || isViewer}
              onChange={(e) =>
                handlePriorityChange(e.target.value as WorkItemPriority)
              }
              className="rounded border border-[#202622] bg-[#050706] px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* TYPE ROW */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] text-[#9ca3af]">TYPE</span>
            <span className="text-xs text-white">{item.type || "TASK"}</span>
          </div>

          {/* STORY POINTS ROW (EDITABLE) */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] text-[#9ca3af]">STORY POINTS</span>
            <input
              type="number"
              min={0}
              step={1}
              value={storyPointsStr}
              placeholder="Unestimated"
              disabled={isSavingStoryPoints || isViewer}
              onChange={(e) => setStoryPointsStr(e.target.value)}
              onBlur={handleSaveStoryPoints}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveStoryPoints();
              }}
              className="w-24 rounded border border-[#202622] bg-[#050706] px-2 py-0.5 text-right text-xs text-white placeholder:text-[#525d6b] outline-none focus:border-emerald-500 disabled:opacity-60"
            />
          </div>

          {/* ASSIGNEE ROW */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] text-[#9ca3af]">ASSIGNEE</span>
            <select
              value={item.assigneeUserId || ""}
              disabled={isSavingAssignee || isViewer}
              onChange={(e) =>
                handleAssigneeChange(e.target.value ? e.target.value : null)
              }
              className="max-w-[180px] truncate rounded border border-[#202622] bg-[#050706] px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-60"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user?.displayName || m.user?.email || m.userId}
                </option>
              ))}
              {item.assigneeUserId &&
                !members.some((m) => m.userId === item.assigneeUserId) && (
                  <option value={item.assigneeUserId} disabled>
                    Unknown member
                  </option>
                )}
            </select>
          </div>

          {/* TEAM ROW (ZERO-TEAM & MULTI-TEAM CREATION UX) */}
          <div className="flex flex-col py-1 gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#9ca3af]">TEAM</span>
              {teams.length === 0 ? (
                !isCreatingTeam ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6b7280]">No teams yet</span>
                    {canCreateTeam && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewTeamName("");
                          setTeamError(null);
                          setIsCreatingTeam(true);
                        }}
                        className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                      >
                        + Create team
                      </button>
                    )}
                  </div>
                ) : null
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    value={item.teamId || ""}
                    disabled={isSavingTeam || isViewer}
                    onChange={(e) =>
                      handleTeamChange(e.target.value ? e.target.value : null)
                    }
                    className="max-w-[150px] truncate rounded border border-[#202622] bg-[#050706] px-2 py-1 text-xs text-white outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    <option value="">No team</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                    {item.teamId &&
                      !teams.some((t) => t.id === item.teamId) && (
                        <option value={item.teamId} disabled>
                          Unknown team
                        </option>
                      )}
                  </select>

                  {canCreateTeam && !isCreatingTeam && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewTeamName("");
                        setTeamError(null);
                        setIsCreatingTeam(true);
                      }}
                      className="rounded border border-[#202622] bg-[#050706] px-1.5 py-1 text-[11px] font-bold text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition"
                      title="Create new team"
                    >
                      +
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* INLINE TEAM CREATION FORM */}
            {isCreatingTeam && (
              <div className="mt-1 space-y-1.5 rounded border border-[#202622] bg-[#050706] p-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleCreateTeamSubmit();
                    } else if (e.key === "Escape") {
                      setIsCreatingTeam(false);
                      setTeamError(null);
                    }
                  }}
                  placeholder="Team name..."
                  disabled={isSubmittingTeam}
                  autoFocus
                  className="w-full rounded border border-[#202622] bg-[#080a09] px-2 py-1 text-xs text-white placeholder:text-[#525d6b] outline-none focus:border-emerald-500 disabled:opacity-60 font-sans"
                />
                {teamError && (
                  <p className="text-[10px] font-medium text-red-400">{teamError}</p>
                )}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingTeam(false);
                      setTeamError(null);
                    }}
                    disabled={isSubmittingTeam}
                    className="rounded px-2 py-0.5 text-[10px] text-[#9ca3af] hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateTeamSubmit()}
                    disabled={isSubmittingTeam || !newTeamName.trim()}
                    className="rounded bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {isSubmittingTeam ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PARENT ROW */}
          <div className="flex items-center justify-between py-1">
            <span className="text-[11px] text-[#9ca3af]">PARENT</span>
            <span className="truncate max-w-[180px] text-xs text-white">
              {parentItem ? parentItem.title : "Not linked"}
            </span>
          </div>
        </div>

        {/* COMMENTS & HISTORY */}
        <div className="border-t border-[#161a18] pt-4">
          <div className="flex items-center gap-4 border-b border-[#161a18] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("DETAILS")}
              className={`text-[11px] font-bold ${
                activeTab === "DETAILS" ? "text-emerald-400" : "text-[#6b7280]"
              }`}
            >
              Activity & Comments
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {/* COMMENTS SECTION */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b7280] mb-2">
                Comments ({comments.length})
              </span>

              {isLoadingComments ? (
                <p className="text-[11px] text-[#6b7280]">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-[11px] text-[#6b7280]">No comments yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded border border-[#202622] bg-[#050706] p-2.5 font-sans"
                    >
                      <p className="text-xs text-[#e5e7eb]">{c.content}</p>
                      <span className="mt-1 block font-mono text-[9px] text-[#6b7280]">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ADD COMMENT FORM */}
              <form onSubmit={handleAddComment} className="mt-3 space-y-2">
                <input
                  type="text"
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder="Write a comment..."
                  disabled={isAddingComment || isViewer}
                  className="w-full rounded border border-[#202622] bg-[#050706] px-2.5 py-1.5 font-sans text-xs text-white placeholder:text-[#525d6b] outline-none focus:border-emerald-500 disabled:opacity-60"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingComment || !newCommentContent.trim() || isViewer}
                    className="rounded bg-emerald-500 px-3 py-1 text-[10px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {isAddingComment ? "Posting..." : "Comment"}
                  </button>
                </div>
              </form>
            </div>

            {/* HISTORY LOG SECTION */}
            <div className="border-t border-[#161a18] pt-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6b7280] mb-2">
                History Log ({history.length})
              </span>

              {isLoadingHistory ? (
                <p className="text-[11px] text-[#6b7280]">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-[11px] text-[#6b7280]">No history recorded.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between text-[10px] text-[#9ca3af] py-0.5 border-b border-[#161a18] last:border-b-0"
                    >
                      <span className="font-semibold text-white">{h.action}</span>
                      <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DANGER ZONE / DELETE BUTTON */}
      {!isViewer && (
        <div className="border-t border-[#161a18] p-3">
          <button
            type="button"
            onClick={() => onDeleteRequest(item)}
            className="w-full rounded border border-rose-500/40 bg-rose-500/10 py-1.5 font-mono text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            Delete Work Item
          </button>
        </div>
      )}
    </aside>
  );
};
