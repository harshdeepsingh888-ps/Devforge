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
  onSelectItem?: (item: WorkItem) => void;
}

const PRIORITY_OPTIONS: {
  value: WorkItemPriority;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "LOW",
    label: "Low",
    badgeClass: "border-[#d5d9e2] bg-[#f9f8f6] text-[#737373]",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    badgeClass: "border-[#d5d9e2] bg-[#f9f8f6] text-[#171717] font-semibold",
  },
  {
    value: "HIGH",
    label: "High",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-900 font-bold",
  },
  {
    value: "URGENT",
    label: "Urgent",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-900 font-bold",
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
  onSelectItem,
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
  const [isSavingParent, setIsSavingParent] = useState(false);
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

  // PARENT CHANGE
  const handleParentChange = async (newParentId: string | null) => {
    if (
      newParentId === (item.parentId || null) ||
      isSavingParent ||
      isViewer
    ) {
      return;
    }

    setIsSavingParent(true);
    setError(null);

    try {
      const updated = await api.updateWorkItem(
        workspace.id,
        item.id,
        { parentId: newParentId },
        project.id,
      );
      onItemUpdated(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update parent work item.",
      );
    } finally {
      setIsSavingParent(false);
    }
  };

  // CREATE TEAM SUBMIT & AUTO-ASSIGNMENT
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

  const itemType = (item.type || "TASK").toUpperCase();

  // Filter valid candidate parents from the current project, excluding self
  const potentialParents = allItems.filter(
    (candidate) =>
      candidate.id !== item.id &&
      (!candidate.projectId || candidate.projectId === project.id),
  );

  let candidateParents: WorkItem[] = [];
  if (itemType === "EPIC") {
    // EPIC cannot have a parent
    candidateParents = [];
  } else if (itemType === "FEATURE") {
    // FEATURE must have an EPIC parent
    candidateParents = potentialParents.filter(
      (c) => (c.type || "TASK").toUpperCase() === "EPIC",
    );
  } else {
    // TASK or BUG can have EPIC or FEATURE parent
    candidateParents = potentialParents.filter((c) => {
      const t = (c.type || "TASK").toUpperCase();
      return t === "EPIC" || t === "FEATURE";
    });
  }

  const directChildren = allItems.filter(
    (candidate) =>
      candidate.parentId === item.id &&
      (!candidate.projectId || candidate.projectId === project.id),
  );

  const parentItem = item.parentId
    ? allItems.find((i) => i.id === item.parentId)
    : null;

  return (
    <aside className="flex h-full w-full flex-col border-l border-[#d5d9e2] bg-white font-sans text-xs text-[#0a0a0a] select-none">
      {/* HEADER BAR */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#d5d9e2] bg-white px-5">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full border border-[#d5d9e2] bg-[#f2ede5] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#0a0a0a]">
            {item.type || "TASK"}
          </span>

          <span className="text-[11px] font-mono font-bold text-[#858585] tracking-widest uppercase">
            INSPECTOR
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-lg text-[#858585] hover:bg-[#f2ede5] hover:text-[#0a0a0a] transition"
          title="Close Inspector (Esc)"
        >
          &times;
        </button>
      </div>

      {/* ERROR NOTIFICATION */}
      {error && (
        <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-sans">
          {error}
        </div>
      )}

      {/* CONTENT SCROLL AREA */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#f9f8f6]">
        {/* TOP SECTION: TITLE & DESCRIPTION */}
        <div className="rounded-2xl border border-[#d5d9e2] bg-white p-4 shadow-xs space-y-4">
          {/* TITLE FIELD */}
          <div>
            <label className="mb-1.5 block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#858585]">
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
              className="w-full rounded-xl border border-transparent bg-transparent px-2.5 py-1.5 font-sans text-base font-bold tracking-tight text-[#0a0a0a] outline-none transition hover:border-[#d5d9e2] focus:border-[#0a0a0a] focus:bg-white disabled:opacity-60"
            />
          </div>

          {/* DESCRIPTION FIELD */}
          <div>
            <label className="mb-1.5 block text-[10px] font-mono font-semibold uppercase tracking-wider text-[#858585]">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="No description provided. Click to add details..."
              disabled={isSavingDesc || isViewer}
              className="w-full rounded-xl border border-[#d5d9e2] bg-white p-3 font-sans text-xs leading-relaxed text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]/10 disabled:opacity-60"
            />
          </div>
        </div>

        {/* PROPERTIES CARD */}
        <div className="rounded-2xl border border-[#d5d9e2] bg-white p-4 shadow-xs space-y-3.5">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#858585]">
            Properties
          </div>

          {/* STATUS ROW */}
          <div className="flex items-center justify-between py-1 border-b border-[#f2ede5] last:border-b-0">
            <span className="text-[11px] font-mono font-semibold text-[#858585]">STATUS</span>
            {allowedTargetStates.length > 0 && !isViewer ? (
              <select
                value={item.workflowStateId || ""}
                disabled={isTransitioningStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1 text-xs text-[#0a0a0a] font-medium outline-none focus:border-[#0a0a0a] focus:bg-white font-sans"
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
              <span className="rounded-full border border-[#d5d9e2] bg-[#f2ede5] px-2.5 py-0.5 text-xs text-[#0a0a0a] font-mono font-medium">
                {currentStateObj ? currentStateObj.name : "Unknown"}
              </span>
            )}
          </div>

          {/* PRIORITY ROW */}
          <div className="flex items-center justify-between py-1 border-b border-[#f2ede5] last:border-b-0">
            <span className="text-[11px] font-mono font-semibold text-[#858585]">PRIORITY</span>
            <select
              value={item.priority || "MEDIUM"}
              disabled={isSavingPriority || isViewer}
              onChange={(e) =>
                handlePriorityChange(e.target.value as WorkItemPriority)
              }
              className="rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1 text-xs text-[#0a0a0a] font-medium outline-none focus:border-[#0a0a0a] focus:bg-white disabled:opacity-60 font-sans"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* TYPE ROW */}
          <div className="flex items-center justify-between py-1 border-b border-[#f2ede5] last:border-b-0">
            <span className="text-[11px] font-mono font-semibold text-[#858585]">TYPE</span>
            <span className="rounded-full border border-[#d5d9e2] bg-[#f2ede5] px-2 py-0.5 text-xs text-[#0a0a0a] font-mono font-bold">
              {item.type || "TASK"}
            </span>
          </div>

          {/* STORY POINTS ROW (EDITABLE) */}
          <div className="flex items-center justify-between py-1 border-b border-[#f2ede5] last:border-b-0">
            <span className="text-[11px] font-mono font-semibold text-[#858585]">STORY POINTS</span>
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
              className="w-24 rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1 text-right text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none focus:border-[#0a0a0a] focus:bg-white disabled:opacity-60 font-mono"
            />
          </div>

          {/* ASSIGNEE ROW */}
          <div className="flex items-center justify-between py-1 border-b border-[#f2ede5] last:border-b-0">
            <span className="text-[11px] font-mono font-semibold text-[#858585]">ASSIGNEE</span>
            <select
              value={item.assigneeUserId || ""}
              disabled={isSavingAssignee || isViewer}
              onChange={(e) =>
                handleAssigneeChange(e.target.value ? e.target.value : null)
              }
              className="max-w-[180px] truncate rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1 text-xs text-[#0a0a0a] font-medium outline-none focus:border-[#0a0a0a] focus:bg-white disabled:opacity-60 font-sans"
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

          {/* TEAM ROW */}
          <div className="flex flex-col py-1 gap-1.5 border-b border-[#f2ede5] last:border-b-0">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-semibold text-[#858585]">TEAM</span>
              {teams.length === 0 ? (
                !isCreatingTeam ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#858585] font-sans">No teams yet</span>
                    {canCreateTeam && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewTeamName("");
                          setTeamError(null);
                          setIsCreatingTeam(true);
                        }}
                        className="text-[10px] font-mono font-bold text-[#0a0a0a] hover:underline transition"
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
                    className="max-w-[150px] truncate rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1 text-xs text-[#0a0a0a] font-medium outline-none focus:border-[#0a0a0a] focus:bg-white disabled:opacity-60 font-sans"
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
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d5d9e2] bg-white text-xs font-bold text-[#0a0a0a] hover:bg-[#f2ede5] transition shadow-2xs"
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
              <div className="mt-1 space-y-2 rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] p-3 shadow-xs">
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
                  className="w-full rounded-lg border border-[#d5d9e2] bg-white px-3 py-1.5 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none focus:border-[#0a0a0a] disabled:opacity-60 font-sans"
                />
                {teamError && (
                  <p className="text-[10px] font-medium text-rose-700 font-sans">{teamError}</p>
                )}
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingTeam(false);
                      setTeamError(null);
                    }}
                    disabled={isSubmittingTeam}
                    className="rounded-full border border-[#d5d9e2] px-2.5 py-0.5 text-[10px] text-[#858585] hover:text-[#0a0a0a] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateTeamSubmit()}
                    disabled={isSubmittingTeam || !newTeamName.trim()}
                    className="rounded-full bg-[#0a0a0a] px-3 py-0.5 text-[10px] font-semibold text-white hover:bg-[#262626] disabled:opacity-40"
                  >
                    {isSubmittingTeam ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* PARENT ROW */}
          {itemType === "EPIC" ? (
            <div className="flex items-center justify-between py-1 border-b border-[#f2ede5] last:border-b-0">
              <span className="text-[11px] font-mono font-semibold text-[#858585]">PARENT</span>
              <span className="text-xs text-[#858585] italic font-mono">
                None (EPIC cannot have parent)
              </span>
            </div>
          ) : itemType === "FEATURE" ? (
            <div className="flex flex-col py-1 gap-1.5 border-b border-[#f2ede5] last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold text-[#858585]">PARENT (EPIC)</span>
                <select
                  value={item.parentId || ""}
                  disabled={isSavingParent || isViewer || candidateParents.length === 0}
                  onChange={(e) => {
                    if (e.target.value) {
                      void handleParentChange(e.target.value);
                    }
                  }}
                  className="max-w-[180px] truncate rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1 text-xs text-[#0a0a0a] font-medium outline-none focus:border-[#0a0a0a] focus:bg-white disabled:opacity-60 font-mono"
                >
                  {!item.parentId && (
                    <option value="" disabled>
                      Select parent Epic...
                    </option>
                  )}
                  {candidateParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.type || "EPIC"}] {p.title}
                    </option>
                  ))}
                  {item.parentId &&
                    !candidateParents.some((p) => p.id === item.parentId) && (
                      <option value={item.parentId} disabled>
                        {parentItem
                          ? `[${parentItem.type || "EPIC"}] ${parentItem.title}`
                          : "Unknown parent"}
                      </option>
                    )}
                </select>
              </div>
              {candidateParents.length === 0 && !item.parentId && (
                <p className="text-[10px] text-amber-700 font-sans">
                  No Epics available in this project.
                </p>
              )}
              {parentItem && onSelectItem && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectItem(parentItem)}
                    className="text-[10px] font-mono text-[#0a0a0a] font-bold hover:underline transition flex items-center gap-1.5"
                    title={`Jump to parent: ${parentItem.title}`}
                  >
                    <span>&uarr; Jump to parent</span>
                    <span className="max-w-[120px] truncate text-[#858585]">
                      ({parentItem.title})
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col py-1 gap-1.5 border-b border-[#f2ede5] last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold text-[#858585]">PARENT</span>
                <select
                  value={item.parentId || ""}
                  disabled={isSavingParent || isViewer}
                  onChange={(e) =>
                    void handleParentChange(
                      e.target.value ? e.target.value : null,
                    )
                  }
                  className="max-w-[180px] truncate rounded-lg border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-1 text-xs text-[#0a0a0a] font-medium outline-none focus:border-[#0a0a0a] focus:bg-white disabled:opacity-60 font-mono"
                >
                  <option value="">Not linked</option>
                  {candidateParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.type || "ITEM"}] {p.title}
                    </option>
                  ))}
                  {item.parentId &&
                    !candidateParents.some((p) => p.id === item.parentId) && (
                      <option value={item.parentId} disabled>
                        {parentItem
                          ? `[${parentItem.type || "ITEM"}] ${parentItem.title}`
                          : "Unknown parent"}
                      </option>
                    )}
                </select>
              </div>
              {parentItem && onSelectItem && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSelectItem(parentItem)}
                    className="text-[10px] font-mono text-[#0a0a0a] font-bold hover:underline transition flex items-center gap-1.5"
                    title={`Jump to parent: ${parentItem.title}`}
                  >
                    <span>&uarr; Jump to parent</span>
                    <span className="max-w-[120px] truncate text-[#858585]">
                      ({parentItem.title})
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CHILDREN SECTION */}
        <div className="rounded-2xl border border-[#d5d9e2] bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#858585]">
              Children ({directChildren.length})
            </span>
          </div>

          {directChildren.length === 0 ? (
            <p className="text-[11px] text-[#858585] font-sans">No child items linked.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {directChildren.map((child) => {
                const childState = workflowDetails?.states.find(
                  (s) => s.id === child.workflowStateId,
                );
                return (
                  <div
                    key={child.id}
                    onClick={() => onSelectItem && onSelectItem(child)}
                    className={`group flex items-center justify-between rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] p-2.5 transition shadow-xs ${
                      onSelectItem
                        ? "cursor-pointer hover:border-[#0a0a0a] hover:bg-white"
                        : ""
                    }`}
                    title={
                      onSelectItem
                        ? `Click to inspect ${child.title}`
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="shrink-0 rounded-full border border-[#d5d9e2] bg-[#f2ede5] px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#0a0a0a]">
                        {child.type || "TASK"}
                      </span>
                      <span className="truncate text-xs font-medium text-[#0a0a0a] group-hover:text-black transition font-sans">
                        {child.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {childState && (
                        <span className="rounded-full border border-[#d5d9e2] bg-white px-1.5 py-0.5 font-mono text-[9px] text-[#858585]">
                          {childState.name}
                        </span>
                      )}
                      {onSelectItem && (
                        <span className="text-[10px] text-[#858585] group-hover:text-[#0a0a0a] font-mono font-bold">
                          &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* COMMENTS & ACTIVITY */}
        <div className="rounded-2xl border border-[#d5d9e2] bg-white p-4 shadow-xs space-y-4">
          <div className="flex items-center gap-4 border-b border-[#f2ede5] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("DETAILS")}
              className={`text-[11px] font-mono font-bold uppercase tracking-wider ${
                activeTab === "DETAILS" ? "text-[#0a0a0a]" : "text-[#858585]"
              }`}
            >
              Activity & Comments
            </button>
          </div>

          <div className="space-y-4 font-sans">
            {/* COMMENTS SECTION */}
            <div>
              <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#858585] mb-2">
                Comments ({comments.length})
              </span>

              {isLoadingComments ? (
                <p className="text-[11px] text-[#858585]">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-[11px] text-[#858585]">No comments yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] p-3 font-sans shadow-xs"
                    >
                      <p className="text-xs text-[#0a0a0a] leading-relaxed">{c.content}</p>
                      <span className="mt-1.5 block font-mono text-[9px] text-[#858585]">
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
                  className="w-full rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] px-3 py-2 font-sans text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:bg-white focus:ring-1 focus:ring-[#0a0a0a]/10 disabled:opacity-60"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingComment || !newCommentContent.trim() || isViewer}
                    className="rounded-full bg-[#0a0a0a] px-4 py-1.5 text-[10px] font-semibold text-white shadow-xs hover:bg-[#262626] disabled:opacity-40 transition"
                  >
                    {isAddingComment ? "Posting..." : "Comment"}
                  </button>
                </div>
              </form>
            </div>

            {/* HISTORY LOG SECTION */}
            <div className="border-t border-[#f2ede5] pt-3">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#858585] mb-2">
                History Log ({history.length})
              </span>

              {isLoadingHistory ? (
                <p className="text-[11px] text-[#858585]">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-[11px] text-[#858585]">No history recorded.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between text-[10px] text-[#858585] py-1 border-b border-[#f2ede5] last:border-b-0 font-mono"
                    >
                      <span className="font-semibold text-[#0a0a0a]">{h.action}</span>
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
        <div className="border-t border-[#d5d9e2] bg-white p-4">
          <button
            type="button"
            onClick={() => onDeleteRequest(item)}
            className="w-full rounded-full border border-rose-200 bg-white py-2 font-mono text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition shadow-xs"
          >
            Delete Work Item
          </button>
        </div>
      )}
    </aside>
  );
};
