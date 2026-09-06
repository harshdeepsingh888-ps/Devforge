import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import { api } from "../api/api";
import { WorkItemInspector } from "../components/work-stream/WorkItemInspector";

import type {
  Project,
  Team,
  WorkItem,
  WorkItemPriority,
  WorkItemType,
  WorkflowDetails,
  WorkflowState,
  Workspace,
  WorkspaceMember,
} from "../types/api.types";

interface WorkStreamProps {
  workspace: Workspace;
  project: Project;
}

const TYPE_OPTIONS: {
  value: WorkItemType;
  label: string;
  selectedClass: string;
  unselectedClass: string;
}[] = [
  {
    value: "TASK",
    label: "Task",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
  },
  {
    value: "BUG",
    label: "Bug",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
  },
  {
    value: "FEATURE",
    label: "Feature",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
  },
  {
    value: "EPIC",
    label: "Epic",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
  },
];

const PRIORITY_OPTIONS: {
  value: WorkItemPriority;
  label: string;
  selectedClass: string;
  unselectedClass: string;
  badgeClass: string;
}[] = [
  {
    value: "LOW",
    label: "Low",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
    badgeClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#737373]",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
    badgeClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#171717] font-semibold",
  },
  {
    value: "HIGH",
    label: "High",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-900 font-bold",
  },
  {
    value: "URGENT",
    label: "Urgent",
    selectedClass:
      "border-[#0a0a0a] bg-[#0a0a0a] text-white font-bold shadow-xs",
    unselectedClass:
      "border-[#d5d9e2] bg-[#f9f8f6] text-[#0a0a0a] hover:bg-[#f2ede5] font-semibold",
    badgeClass:
      "border-rose-200 bg-rose-50 text-rose-900 font-bold",
  },
];

export const WorkStream: React.FC<WorkStreamProps> = ({
  workspace,
  project,
}) => {
  // SHARED WORK ITEMS STATE
  const [items, setItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // WORKFLOW STATE & TRANSITIONS
  const [workflowDetails, setWorkflowDetails] =
    useState<WorkflowDetails | null>(null);

  // PROJECTION STATE
  const [projection, setProjection] = useState<"BOARD" | "LIST">(
    "BOARD",
  );

  // WORKSPACE MEMBERS & TEAMS STATE
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // LOAD WORKSPACE-LEVEL MEMBERS & TEAMS ONCE PER WORKSPACE
  useEffect(() => {
    let isMounted = true;
    async function loadWorkspaceData() {
      try {
        const [membersData, teamsData] = await Promise.all([
          api.getWorkspaceMembers(workspace.id),
          api.getTeams(workspace.id),
        ]);
        if (isMounted) {
          setMembers(membersData);
          setTeams(teamsData);
        }
      } catch (err) {
        console.error("Failed to load workspace members/teams:", err);
      }
    }
    void loadWorkspaceData();
    return () => {
      isMounted = false;
    };
  }, [workspace.id]);

  // SELECTED WORK ITEM INSPECTOR STATE
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | null>(
    null,
  );

  // Creation Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WorkItemType>("TASK");
  const [parentId, setParentId] = useState<string>("");
  const [priority, setPriority] =
    useState<WorkItemPriority>("MEDIUM");
  const [isCreating, setIsCreating] = useState(false);

  // Candidate parents for creation modal based on selected type
  const candidateModalParents = items.filter((i) => {
    const isSameProject = !i.projectId || i.projectId === project.id;
    if (!isSameProject) return false;
    const t = (i.type || "TASK").toUpperCase();
    if (type === "EPIC") return false;
    if (type === "FEATURE") return t === "EPIC";
    return t === "EPIC" || t === "FEATURE"; // TASK or BUG
  });

  const handleTypeChange = (newType: WorkItemType) => {
    setType(newType);
    if (newType === "EPIC") {
      setParentId("");
    } else if (newType === "FEATURE") {
      const epicCandidates = items.filter(
        (i) =>
          (!i.projectId || i.projectId === project.id) &&
          (i.type || "TASK").toUpperCase() === "EPIC",
      );
      if (!epicCandidates.some((e) => e.id === parentId)) {
        setParentId(epicCandidates[0]?.id || "");
      }
    } else {
      // TASK or BUG
      const validCandidates = items.filter((i) => {
        const isSameProject = !i.projectId || i.projectId === project.id;
        const t = (i.type || "TASK").toUpperCase();
        return isSameProject && (t === "EPIC" || t === "FEATURE");
      });
      if (parentId && !validCandidates.some((c) => c.id === parentId)) {
        setParentId("");
      }
    }
  };

  // Deletion Modal state
  const [itemToDelete, setItemToDelete] =
    useState<WorkItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Transition state
  const [movingItemId, setMovingItemId] = useState<string | null>(
    null,
  );
  const [transitioningId, setTransitioningId] = useState<string | null>(
    null,
  );
  const [transitionError, setTransitionError] = useState<
    string | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  // RESET SELECTION & LOAD WORK ITEMS & WORKFLOW DETAILS ON PROJECT CHANGE
  const loadData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setSelectedWorkItemId(null);

    try {
      // 1. Load project work items
      const workItemsData = await api.getWorkItems(
        workspace.id,
        project.id,
      );
      setItems(workItemsData);

      // 2. Load workspace workflows
      const workflows = await api.getWorkflows(workspace.id);

      let targetWorkflowId: string | undefined = undefined;

      if (workItemsData.length > 0 && workItemsData[0]?.workflowId) {
        targetWorkflowId = workItemsData[0].workflowId;
      } else {
        const defaultWf =
          workflows.find((w) => w.isDefault) || workflows[0];
        if (defaultWf) {
          targetWorkflowId = defaultWf.id;
        }
      }

      // 3. Load workflow details if a workflow is resolved
      if (targetWorkflowId) {
        const details = await api.getWorkflowDetails(
          workspace.id,
          targetWorkflowId,
        );
        details.states.sort((a, b) => a.position - b.position);
        setWorkflowDetails(details);
      } else {
        setWorkflowDetails(null);
      }
    } catch (err) {
      console.error("Failed to load work stream data:", err);
      setItems([]);
      setWorkflowDetails(null);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load work stream data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id, project.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenModal = () => {
    setTitle("");
    setType("TASK");
    setParentId("");
    setPriority("MEDIUM");
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isCreating) return;
    setIsModalOpen(false);
    setTitle("");
    setType("TASK");
    setParentId("");
    setPriority("MEDIUM");
  };

  const handleCreateWorkItem = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const workItemTitle = title.trim();
    if (!workItemTitle || isCreating) return;

    if (type === "FEATURE" && !parentId) {
      setError("A Feature requires an Epic parent. Please select a parent Epic.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const targetParentId =
        type === "EPIC"
          ? null
          : parentId
          ? parentId
          : null;

      const created = await api.createWorkItem(
        workspace.id,
        project.id,
        workItemTitle,
        priority,
        type,
        targetParentId,
      );

      setItems((current) => [created, ...current]);

      if (!workflowDetails && created.workflowId) {
        try {
          const details = await api.getWorkflowDetails(
            workspace.id,
            created.workflowId,
          );
          details.states.sort((a, b) => a.position - b.position);
          setWorkflowDetails(details);
        } catch {
          // ignore
        }
      }

      setIsModalOpen(false);
      setTitle("");
      setType("TASK");
      setParentId("");
      setPriority("MEDIUM");
    } catch (err) {
      console.error("Failed to create work item:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create work item.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!itemToDelete || isDeleting) return;

    const targetId = itemToDelete.id;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await api.deleteWorkItem(workspace.id, project.id, targetId);

      setItems((current) =>
        current.filter((item) => item.id !== targetId),
      );

      if (selectedWorkItemId === targetId) {
        setSelectedWorkItemId(null);
      }

      setItemToDelete(null);
    } catch (err) {
      console.error("Failed to delete work item:", err);
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Failed to delete work item.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // EXECUTE WORK ITEM TRANSITION (CONTROLLED MOVE)
  const handleTransitionState = async (
    item: WorkItem,
    targetStateId: string,
  ): Promise<void> => {
    if (transitioningId) return;

    setTransitioningId(item.id);
    setTransitionError(null);

    try {
      const updated = await api.transitionWorkItem(
        workspace.id,
        item.id,
        targetStateId,
      );

      setItems((current) =>
        current.map((i) => (i.id === updated.id ? updated : i)),
      );

      setMovingItemId(null);
    } catch (err) {
      console.error("Failed to transition work item state:", err);
      setTransitionError(
        err instanceof Error
          ? err.message
          : "Failed to move work item.",
      );
    } finally {
      setTransitioningId(null);
    }
  };

  const handleItemUpdated = (updatedItem: WorkItem) => {
    setItems((current) =>
      current.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
    );
  };

  const getAllowedTargetStates = (
    item: WorkItem,
  ): WorkflowState[] => {
    if (!workflowDetails) return [];

    const currentStateId = item.workflowStateId;
    if (!currentStateId) return [];

    const validTransitions = workflowDetails.transitions.filter(
      (t) => t.fromStateId === currentStateId,
    );

    const validTargetIds = new Set(
      validTransitions.map((t) => t.toStateId),
    );

    return workflowDetails.states.filter((state) =>
      validTargetIds.has(state.id),
    );
  };

  const handleTeamCreated = (newTeam: Team) => {
    setTeams((current) => {
      if (current.some((t) => t.id === newTeam.id)) return current;
      return [...current, newTeam];
    });
  };

  const selectedItem = items.find((i) => i.id === selectedWorkItemId);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#f9f8f6]">
      {/* MAIN WORK STREAM AREA */}
      <main className="flex-1 min-w-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* PROJECT HEADER & PROJECTION TABS */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#d5d9e2] pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <div>
              <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#858585]">
                PROJECT CONTROL
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a] sm:text-3xl font-sans">
                {project.name}
              </h1>
            </div>

            {/* PROJECTION NAVIGATION TABS */}
            <div className="inline-flex p-1 rounded-full bg-[#ebe6dc] border border-[#d5d9e2] shadow-xs">
              <button
                type="button"
                onClick={() => setProjection("BOARD")}
                className={`rounded-full px-4 py-1.5 font-sans text-xs transition duration-150 ${
                  projection === "BOARD"
                    ? "bg-[#0a0a0a] font-bold text-white shadow-xs"
                    : "font-semibold text-[#737373] hover:text-[#0a0a0a]"
                }`}
              >
                Board
              </button>

              <button
                type="button"
                onClick={() => setProjection("LIST")}
                className={`rounded-full px-4 py-1.5 font-sans text-xs transition duration-150 ${
                  projection === "LIST"
                    ? "bg-[#0a0a0a] font-bold text-white shadow-xs"
                    : "font-semibold text-[#737373] hover:text-[#0a0a0a]"
                }`}
              >
                List
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] px-5 py-2 font-sans text-xs font-bold text-white shadow-xs transition hover:bg-[#262626]"
          >
            + Create Work Item
          </button>
        </div>

        {/* ERROR BANNERS */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-sans text-xs text-rose-700 shadow-xs"
          >
            <p className="font-semibold">{error}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-1.5 text-xs font-medium underline underline-offset-4 hover:text-rose-900"
            >
              Reload data
            </button>
          </div>
        )}

        {transitionError && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-sans text-xs text-amber-800 flex items-center justify-between shadow-xs"
          >
            <span>{transitionError}</span>
            <button
              type="button"
              onClick={() => setTransitionError(null)}
              className="text-xs font-semibold underline hover:text-amber-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CREATE WORK ITEM MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/40 p-4 font-sans text-xs select-none backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-[#d5d9e2] bg-white p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-[#d5d9e2] pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#858585] block">
                    NEW RECORD
                  </span>
                  <h2 className="text-lg font-bold tracking-tight text-[#0a0a0a] font-sans">
                    Create Work Item
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isCreating}
                  className="rounded-full p-1 text-xl leading-none text-[#858585] transition hover:bg-[#f9f8f6] hover:text-[#0a0a0a] disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateWorkItem} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373]">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    maxLength={255}
                    disabled={isCreating}
                    autoFocus
                    className="w-full rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] px-3.5 py-2.5 text-xs text-[#0a0a0a] placeholder:text-[#858585] outline-none transition focus:border-[#0a0a0a] focus:bg-white focus:ring-1 focus:ring-[#0a0a0a]/10 disabled:opacity-60 font-sans"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373]">
                    Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {TYPE_OPTIONS.map((opt) => {
                      const isSelected = type === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isCreating}
                          onClick={() => handleTypeChange(opt.value)}
                          className={`rounded-full px-3 py-2 text-center text-xs transition border ${
                            isSelected
                              ? opt.selectedClass
                              : opt.unselectedClass
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373]">
                    {type === "FEATURE" ? "Parent (EPIC) *" : "Parent"}
                  </label>

                  {type === "EPIC" ? (
                    <div className="w-full rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] px-3.5 py-2.5 text-xs text-[#858585] italic font-mono">
                      None (EPIC cannot have parent)
                    </div>
                  ) : type === "FEATURE" ? (
                    <div className="space-y-1">
                      <select
                        value={parentId}
                        disabled={isCreating || candidateModalParents.length === 0}
                        onChange={(e) => setParentId(e.target.value)}
                        className="w-full rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] px-3.5 py-2.5 text-xs text-[#0a0a0a] outline-none transition focus:border-[#0a0a0a] focus:bg-white focus:ring-1 focus:ring-[#0a0a0a]/10 disabled:opacity-60 font-mono"
                      >
                        <option value="" disabled>
                          {candidateModalParents.length === 0
                            ? "No Epics available in project"
                            : "Select parent Epic..."}
                        </option>
                        {candidateModalParents.map((p) => (
                          <option key={p.id} value={p.id}>
                            [{p.type || "EPIC"}] {p.title}
                          </option>
                        ))}
                      </select>
                      {candidateModalParents.length === 0 && (
                        <p className="text-[10px] text-amber-700 font-sans">
                          A Feature requires a parent Epic. Create an Epic first.
                        </p>
                      )}
                    </div>
                  ) : (
                    <select
                      value={parentId}
                      disabled={isCreating}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] px-3.5 py-2.5 text-xs text-[#0a0a0a] outline-none transition focus:border-[#0a0a0a] focus:bg-white focus:ring-1 focus:ring-[#0a0a0a]/10 disabled:opacity-60 font-mono"
                    >
                      <option value="">Not linked (Standalone)</option>
                      {candidateModalParents.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.type || "ITEM"}] {p.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-mono font-bold uppercase tracking-wider text-[#737373]">
                    Priority
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITY_OPTIONS.map((opt) => {
                      const isSelected = priority === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={isCreating}
                          onClick={() => setPriority(opt.value)}
                          className={`rounded-full px-3 py-2 text-center text-xs transition border ${
                            isSelected
                              ? opt.selectedClass
                              : opt.unselectedClass
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#d5d9e2]">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isCreating}
                    className="rounded-full border border-[#d5d9e2] bg-white px-5 py-2 text-xs font-semibold text-[#0a0a0a] shadow-xs transition hover:bg-[#f9f8f6] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isCreating ||
                      !title.trim() ||
                      (type === "FEATURE" &&
                        (!parentId || candidateModalParents.length === 0))
                    }
                    className="rounded-full bg-[#0a0a0a] px-6 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#262626] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCreating ? "Creating..." : "Create Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/40 p-4 font-sans text-xs select-none backdrop-blur-xs">
            <div className="w-full max-w-md space-y-4 rounded-2xl border border-[#d5d9e2] bg-white p-7 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#d5d9e2] pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 font-mono">
                  Delete work item?
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    if (!isDeleting) {
                      setItemToDelete(null);
                      setDeleteError(null);
                    }
                  }}
                  disabled={isDeleting}
                  className="rounded-full p-1 text-lg leading-none text-[#858585] transition hover:text-[#0a0a0a] disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="space-y-1.5 text-[#0a0a0a]">
                <p className="break-words text-xs font-semibold text-[#0a0a0a]">
                  &ldquo;{itemToDelete.title}&rdquo; will be permanently deleted.
                </p>
                <p className="text-[11px] text-[#737373]">
                  This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
                >
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#d5d9e2]">
                <button
                  type="button"
                  onClick={() => {
                    setItemToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="rounded-full border border-[#d5d9e2] bg-white px-4 py-2 text-xs font-semibold text-[#0a0a0a] shadow-xs transition hover:bg-[#f9f8f6] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isDeleting ? "Deleting..." : "Delete item"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROJECTION: BOARD vs LIST */}
        {isLoading ? (
          <div className="py-20 text-center font-mono text-xs text-[#858585]">
            Loading work stream…
          </div>
        ) : projection === "BOARD" ? (
          /* BOARD PROJECTION */
          <div>
            {items.length === 0 && (
              <div className="mb-6 rounded-2xl border border-dashed border-[#d5d9e2] bg-white p-12 text-center font-sans text-xs shadow-xs">
                <p className="font-bold text-[#0a0a0a] text-sm">No work items yet</p>
                <p className="mt-1 text-[#858585]">
                  Create your first work item to start planning and tracking engineering work.
                </p>
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="mt-4 inline-flex items-center rounded-full bg-[#0a0a0a] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#262626]"
                >
                  + Create Work Item
                </button>
              </div>
            )}

            {workflowDetails && workflowDetails.states.length > 0 ? (
              <div className="overflow-x-auto pb-6">
                <div
                  className="grid gap-5 min-w-[760px]"
                  style={{
                    gridTemplateColumns: `repeat(${workflowDetails.states.length}, minmax(260px, 1fr))`,
                  }}
                >
                  {workflowDetails.states.map((state) => {
                    const stateItems = items.filter(
                      (i) => i.workflowStateId === state.id,
                    );

                    return (
                      <div
                        key={state.id}
                        className="flex flex-col rounded-2xl border border-[#d5d9e2] bg-[#f2ede5]/75 min-h-[460px] shadow-xs"
                      >
                        {/* COLUMN HEADER */}
                        <div className="flex items-center justify-between border-b border-[#d5d9e2]/80 px-4 py-3 bg-white/40 rounded-t-2xl">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#0a0a0a] font-sans">
                            {state.name}
                          </span>
                          <span className="rounded-full bg-white border border-[#d5d9e2] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#0a0a0a] shadow-xs">
                            {stateItems.length}
                          </span>
                        </div>

                        {/* COLUMN ITEMS LIST */}
                        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                          {stateItems.map((item) => {
                            const priorityConfig =
                              PRIORITY_OPTIONS.find(
                                (p) => p.value === item.priority,
                              ) || PRIORITY_OPTIONS[1];

                            const allowedTargets =
                              getAllowedTargetStates(item);

                            const isMoveMenuOpen =
                              movingItemId === item.id;

                            const isItemTransitioning =
                              transitioningId === item.id;

                            const isSelected =
                              selectedWorkItemId === item.id;

                            return (
                              <div
                                key={item.id}
                                onClick={() => setSelectedWorkItemId(item.id)}
                                className={[
                                  "group relative cursor-pointer rounded-xl border p-4 text-xs transition duration-150 bg-white",
                                  isSelected
                                    ? "border-[#0a0a0a] ring-2 ring-[#0a0a0a]/10 shadow-sm"
                                    : "border-[#d5d9e2] hover:border-[#0a0a0a] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_3px_10px_rgba(0,0,0,0.06)]",
                                ].join(" ")}
                              >
                                {/* CARD TOP METADATA & ACTIONS */}
                                <div className="mb-2.5 flex items-center justify-between gap-1.5 text-[10px]">
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="rounded-md border border-[#d5d9e2] bg-[#f9f8f6] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#525252] uppercase tracking-wider">
                                      {item.type || "TASK"}
                                    </span>

                                    {item.priority && (
                                      <span
                                        className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] ${priorityConfig.badgeClass}`}
                                      >
                                        {item.priority}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                    {allowedTargets.length > 0 && (
                                      <button
                                        type="button"
                                        disabled={isItemTransitioning}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setMovingItemId((prev) =>
                                            prev === item.id
                                              ? null
                                              : item.id,
                                          );
                                        }}
                                        className="rounded-full border border-[#d5d9e2] bg-white px-2 py-0.5 font-sans text-[10px] font-medium text-[#737373] transition hover:border-[#0a0a0a] hover:text-[#0a0a0a] disabled:opacity-50"
                                        title="Move work item to next state"
                                      >
                                        {isItemTransitioning
                                          ? "Moving..."
                                          : "Move →"}
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteError(null);
                                        setItemToDelete(item);
                                      }}
                                      className="rounded-full border border-rose-200/80 bg-white px-2 py-0.5 font-sans text-[10px] font-medium text-rose-600 transition hover:bg-rose-50"
                                      title="Delete work item"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {/* MOVE STATE POPUP */}
                                {isMoveMenuOpen && (
                                  <div className="mb-3 rounded-xl border border-[#d5d9e2] bg-[#f9f8f6] p-2.5 space-y-1.5 z-10 shadow-md">
                                    <div className="text-[9px] uppercase font-mono font-bold text-[#0a0a0a] tracking-wider">
                                      Move to state:
                                    </div>
                                    <div className="space-y-1">
                                      {allowedTargets.map((target) => (
                                        <button
                                          key={target.id}
                                          type="button"
                                          disabled={isItemTransitioning}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            void handleTransitionState(
                                              item,
                                              target.id,
                                            );
                                          }}
                                          className="w-full rounded-lg border border-[#d5d9e2] bg-white px-2.5 py-1 text-left font-mono text-[10px] font-semibold text-[#0a0a0a] hover:border-[#0a0a0a] hover:bg-[#f2ede5] transition"
                                        >
                                          &rarr; {target.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* CARD TITLE & DESCRIPTION */}
                                <div className="font-sans">
                                  <p className="break-words font-semibold text-xs text-[#0a0a0a] leading-snug group-hover:text-black">
                                    {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="mt-1.5 break-words text-[11px] text-[#737373] line-clamp-2 leading-relaxed">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center font-mono text-xs text-[#858585]">
                No workflow defined for board layout.
              </div>
            )}
          </div>
        ) : (
          /* LIST PROJECTION */
          <div>
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d5d9e2] bg-white p-12 text-center font-sans shadow-xs">
                <div className="mx-auto max-w-sm">
                  <h2 className="text-sm font-bold text-[#0a0a0a]">
                    No work items yet
                  </h2>

                  <p className="mt-1.5 text-xs text-[#858585] leading-relaxed">
                    Create your first work item to start planning and tracking engineering work.
                  </p>

                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="mt-4 inline-flex items-center rounded-full bg-[#0a0a0a] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#262626]"
                  >
                    + Create Work Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#d5d9e2] bg-white overflow-hidden shadow-xs divide-y divide-[#d5d9e2]">
                {items.map((item) => {
                  const priorityConfig =
                    PRIORITY_OPTIONS.find(
                      (p) => p.value === item.priority,
                    ) || PRIORITY_OPTIONS[1];

                  const stateObj = workflowDetails?.states.find(
                    (s) => s.id === item.workflowStateId,
                  );

                  const isSelected = selectedWorkItemId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedWorkItemId(item.id)}
                      className={[
                        "group flex cursor-pointer flex-col gap-2.5 py-3.5 px-4 sm:flex-row sm:items-center sm:justify-between transition",
                        isSelected
                          ? "border-l-4 border-l-[#0a0a0a] bg-[#f2ede5]/60"
                          : "hover:bg-[#f9f8f6]",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="mt-0.5 shrink-0 rounded-md border border-[#d5d9e2] bg-[#f9f8f6] px-2 py-0.5 font-mono text-[9px] font-bold text-[#525252] uppercase tracking-wider">
                          {item.type || "TASK"}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-xs sm:text-sm font-bold text-[#0a0a0a] font-sans">
                            {item.title}
                          </p>

                          {item.description && (
                            <p className="mt-0.5 break-words text-xs text-[#737373] font-sans">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                        {stateObj && (
                          <span className="rounded-full border border-[#d5d9e2] bg-[#f9f8f6] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#737373]">
                            {stateObj.name}
                          </span>
                        )}

                        {item.priority && (
                          <span
                            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${priorityConfig.badgeClass}`}
                          >
                            {item.priority}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteError(null);
                            setItemToDelete(item);
                          }}
                          className="rounded-full border border-rose-200 bg-white px-3 py-0.5 font-sans text-[10px] font-medium text-rose-600 transition hover:bg-rose-50"
                          title="Delete work item"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* WORK ITEM INSPECTOR PANEL */}
      {selectedItem && (
        <>
          {/* DESKTOP SIDE PANEL (lg screens) */}
          <div className="hidden lg:block w-[380px] shrink-0 h-full">
            <WorkItemInspector
              item={selectedItem}
              workspace={workspace}
              project={project}
              workflowDetails={workflowDetails}
              allItems={items}
              members={members}
              teams={teams}
              onClose={() => setSelectedWorkItemId(null)}
              onItemUpdated={handleItemUpdated}
              onTransitionState={handleTransitionState}
              onDeleteRequest={(item) => {
                setDeleteError(null);
                setItemToDelete(item);
              }}
              onTeamCreated={handleTeamCreated}
              onSelectItem={(target) => setSelectedWorkItemId(target.id)}
            />
          </div>

          {/* TABLET / MOBILE OVERLAY DRAWER (< lg screens) */}
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Close inspector"
              onClick={() => setSelectedWorkItemId(null)}
              className="fixed inset-0 bg-[#0a0a0a]/40 backdrop-blur-xs"
            />
            <div className="relative ml-auto flex w-[380px] max-w-[85%] flex-col bg-white border-l border-[#d5d9e2] shadow-2xl h-full">
              <WorkItemInspector
                item={selectedItem}
                workspace={workspace}
                project={project}
                workflowDetails={workflowDetails}
                allItems={items}
                members={members}
                teams={teams}
                onClose={() => setSelectedWorkItemId(null)}
                onItemUpdated={handleItemUpdated}
                onTransitionState={handleTransitionState}
                onDeleteRequest={(item) => {
                  setDeleteError(null);
                  setItemToDelete(item);
                }}
                onTeamCreated={handleTeamCreated}
                onSelectItem={(target) => setSelectedWorkItemId(target.id)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};