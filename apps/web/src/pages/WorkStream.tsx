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
  WorkflowDetails,
  WorkflowState,
  Workspace,
  WorkspaceMember,
} from "../types/api.types";

interface WorkStreamProps {
  workspace: Workspace;
  project: Project;
}

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
      "border-slate-400 bg-slate-500/20 text-slate-200 font-bold",
    unselectedClass:
      "border-[#202622] bg-[#050706] text-slate-400 hover:border-slate-600",
    badgeClass:
      "border-slate-600/40 bg-slate-800/30 text-slate-400",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    selectedClass:
      "border-blue-500/60 bg-blue-500/20 text-blue-300 font-bold",
    unselectedClass:
      "border-[#202622] bg-[#050706] text-zinc-400 hover:border-blue-500/40",
    badgeClass:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",
  },
  {
    value: "HIGH",
    label: "High",
    selectedClass:
      "border-amber-500/60 bg-amber-500/20 text-amber-300 font-bold",
    unselectedClass:
      "border-[#202622] bg-[#050706] text-amber-400/60 hover:border-amber-500/40",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  {
    value: "URGENT",
    label: "Urgent",
    selectedClass:
      "border-rose-500/60 bg-rose-500/20 text-rose-300 font-bold",
    unselectedClass:
      "border-[#202622] bg-[#050706] text-rose-400/60 hover:border-rose-500/40",
    badgeClass:
      "border-rose-500/30 bg-rose-500/10 text-rose-300",
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
  const [priority, setPriority] =
    useState<WorkItemPriority>("MEDIUM");
  const [isCreating, setIsCreating] = useState(false);

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
    setPriority("MEDIUM");
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isCreating) return;
    setIsModalOpen(false);
    setTitle("");
    setPriority("MEDIUM");
  };

  const handleCreateWorkItem = async (
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    const workItemTitle = title.trim();
    if (!workItemTitle || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const created = await api.createWorkItem(
        workspace.id,
        project.id,
        workItemTitle,
        priority,
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
    <div className="flex h-full w-full overflow-hidden">
      {/* MAIN WORK STREAM AREA */}
      <main className="flex-1 min-w-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* PROJECT HEADER & PROJECTION TABS */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#161a18] pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl font-sans">
              {project.name}
            </h1>

            {/* PROJECTION NAVIGATION TABS */}
            <div className="flex items-center gap-4 border-l border-[#161a18] pl-4 sm:pl-6">
              <button
                type="button"
                onClick={() => setProjection("BOARD")}
                className={`pb-1 font-mono text-xs transition border-b-2 ${
                  projection === "BOARD"
                    ? "border-emerald-400 font-bold text-white"
                    : "border-transparent text-[#9ca3af] hover:text-white"
                }`}
              >
                Board
              </button>

              <button
                type="button"
                onClick={() => setProjection("LIST")}
                className={`pb-1 font-mono text-xs transition border-b-2 ${
                  projection === "LIST"
                    ? "border-emerald-400 font-bold text-white"
                    : "border-transparent text-[#9ca3af] hover:text-white"
                }`}
              >
                List
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex min-h-8 shrink-0 items-center justify-center rounded bg-emerald-400 px-3.5 py-1.5 font-mono text-xs font-bold text-[#07110d] transition hover:bg-emerald-300"
          >
            + Create Work Item
          </button>
        </div>

        {/* ERROR BANNERS */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded border border-red-500/40 bg-red-500/10 p-3 font-mono text-xs"
          >
            <p className="font-semibold text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void loadData()}
              className="mt-1 text-xs font-medium text-red-300 underline underline-offset-4 hover:text-red-200"
            >
              Reload data
            </button>
          </div>
        )}

        {transitionError && (
          <div
            role="alert"
            className="mb-5 rounded border border-amber-500/40 bg-amber-500/10 p-3 font-mono text-xs text-amber-300 flex items-center justify-between"
          >
            <span>{transitionError}</span>
            <button
              type="button"
              onClick={() => setTransitionError(null)}
              className="text-xs underline hover:text-amber-200"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* CREATE WORK ITEM MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono text-xs select-none backdrop-blur-xs">
            <div className="w-full max-w-md rounded-md border border-[#202622] bg-[#080a09] p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100">
                  Create work item
                </h2>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isCreating}
                  className="text-base leading-none text-zinc-400 transition hover:text-white disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateWorkItem} className="space-y-4">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8d99a8]">
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
                    className="w-full rounded border border-[#202622] bg-[#050706] px-3 py-2 text-xs text-white placeholder:text-[#525d6b] outline-none transition focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-60 font-mono"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#8d99a8]">
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
                          className={`rounded px-2 py-1.5 text-center text-xs transition border ${
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

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isCreating}
                    className="rounded px-3 py-1.5 font-semibold text-zinc-400 transition hover:bg-[#121714] hover:text-white disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || !title.trim()}
                    className="rounded bg-emerald-400 px-4 py-1.5 font-bold text-[#07110d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isCreating ? "Creating..." : "Create item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono text-xs select-none backdrop-blur-xs">
            <div className="w-full max-w-md space-y-4 rounded-md border border-[#202622] bg-[#080a09] p-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-rose-400">
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
                  className="text-base leading-none text-zinc-400 transition hover:text-white disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <div className="space-y-1.5 text-zinc-300">
                <p className="break-words text-xs font-semibold text-white">
                  &ldquo;{itemToDelete.title}&rdquo; will be permanently
                  deleted.
                </p>
                <p className="text-[11px] text-zinc-400">
                  This action cannot be undone.
                </p>
              </div>

              {deleteError && (
                <div
                  role="alert"
                  className="rounded border border-red-500/50 bg-red-500/10 p-2.5 text-xs font-semibold text-red-300"
                >
                  {deleteError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setItemToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="rounded px-3 py-1.5 font-semibold text-zinc-400 transition hover:bg-[#121714] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="rounded border border-rose-500/50 bg-rose-500/20 px-4 py-1.5 font-bold text-rose-300 transition hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isDeleting ? "Deleting..." : "Delete item"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PROJECTION: BOARD vs LIST */}
        {isLoading ? (
          <div className="py-16 text-center font-mono text-xs text-[#6b7280]">
            Loading work stream…
          </div>
        ) : projection === "BOARD" ? (
          /* BOARD PROJECTION */
          <div>
            {items.length === 0 && (
              <div className="mb-6 rounded border border-dashed border-[#202622] bg-[#080a09] p-6 text-center font-mono text-xs">
                <p className="font-semibold text-white">No work items yet</p>
                <p className="mt-1 text-[#9ca3af]">
                  Create your first work item to start planning and tracking engineering work.
                </p>
                <button
                  type="button"
                  onClick={handleOpenModal}
                  className="mt-3 rounded bg-emerald-400 px-3.5 py-1 text-xs font-bold text-[#07110d] transition hover:bg-emerald-300"
                >
                  + Create Work Item
                </button>
              </div>
            )}

            {workflowDetails && workflowDetails.states.length > 0 ? (
              <div className="overflow-x-auto pb-4">
                <div
                  className="grid gap-4 min-w-[700px]"
                  style={{
                    gridTemplateColumns: `repeat(${workflowDetails.states.length}, minmax(220px, 1fr))`,
                  }}
                >
                  {workflowDetails.states.map((state) => {
                    const stateItems = items.filter(
                      (i) => i.workflowStateId === state.id,
                    );

                    return (
                      <div
                        key={state.id}
                        className="flex flex-col rounded border border-[#161a18] bg-[#080a09]/60 min-h-[350px]"
                      >
                        <div className="flex items-center justify-between border-b border-[#161a18] p-3 font-mono">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9ca3af]">
                            {state.name}
                          </span>
                          <span className="rounded bg-[#161a18] px-1.5 py-0.5 text-[10px] font-semibold text-[#6b7280]">
                            {stateItems.length}
                          </span>
                        </div>

                        <div className="flex-1 p-2 space-y-2.5 overflow-y-auto">
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
                                  "group relative cursor-pointer rounded border p-3 font-mono text-xs transition",
                                  isSelected
                                    ? "border-emerald-400 bg-[#064e3b]/20 shadow-sm"
                                    : "border-[#202622] bg-[#050706] hover:border-[#303c35]",
                                ].join(" ")}
                              >
                                <div className="mb-2 flex items-center justify-between gap-1.5 text-[10px]">
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="rounded border border-[#202622] bg-[#0b0f0d] px-1.5 py-0.5 font-semibold text-[#9ca3af]">
                                      {item.type || "TASK"}
                                    </span>

                                    {item.priority && (
                                      <span
                                        className={`rounded border px-1.5 py-0.5 font-semibold ${priorityConfig.badgeClass}`}
                                      >
                                        {item.priority}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
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
                                        className="rounded border border-[#202622] bg-[#080a09] px-1.5 py-0.5 text-[10px] text-[#9ca3af] transition hover:border-emerald-500/50 hover:text-white disabled:opacity-50"
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
                                      className="rounded border border-[#202622] bg-[#080a09] px-1.5 py-0.5 text-[10px] text-[#9ca3af] transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
                                      title="Delete work item"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {isMoveMenuOpen && (
                                  <div className="mb-2.5 rounded border border-emerald-500/40 bg-[#080a09] p-2 space-y-1.5 z-10 shadow-lg">
                                    <div className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">
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
                                          className="w-full rounded border border-[#202622] bg-[#050706] px-2 py-1 text-left text-[10px] text-white hover:border-emerald-500 hover:bg-emerald-500/10"
                                        >
                                          &rarr; {target.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="font-sans">
                                  <p className="break-words font-medium text-xs text-[#e5e7eb]">
                                    {item.title}
                                  </p>
                                  {item.description && (
                                    <p className="mt-1 break-words text-[11px] text-[#9ca3af]">
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
              <div className="py-12 text-center font-mono text-xs text-[#6b7280]">
                No workflow defined for board layout.
              </div>
            )}
          </div>
        ) : (
          /* LIST PROJECTION */
          <div>
            {items.length === 0 ? (
              <div className="rounded border border-dashed border-[#202622] bg-[#080a09] p-8 text-center sm:p-12 font-mono">
                <div className="mx-auto max-w-sm">
                  <h2 className="text-sm font-semibold text-white">
                    No work items yet
                  </h2>

                  <p className="mt-1.5 text-xs text-[#9ca3af] leading-relaxed">
                    Create your first work item to start planning and tracking engineering work.
                  </p>

                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="mt-4 rounded bg-emerald-400 px-4 py-1.5 text-xs font-bold text-[#07110d] transition hover:bg-emerald-300"
                  >
                    + Create Work Item
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-b border-[#161a18] divide-y divide-[#161a18]">
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
                        "group flex cursor-pointer flex-col gap-2 py-3 px-2 sm:flex-row sm:items-center sm:justify-between transition",
                        isSelected
                          ? "border-l-2 border-emerald-400 bg-[#064e3b]/20"
                          : "hover:bg-[#0b0f0d]/50",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="mt-0.5 shrink-0 rounded border border-[#202622] bg-[#0b0f0d] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#9ca3af]">
                          {item.type || "TASK"}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-xs sm:text-sm font-medium text-[#e5e7eb] font-sans">
                            {item.title}
                          </p>

                          {item.description && (
                            <p className="mt-0.5 break-words text-xs text-[#9ca3af] font-sans">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                        {stateObj && (
                          <span className="rounded border border-[#202622] bg-[#080a09] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#9ca3af]">
                            {stateObj.name}
                          </span>
                        )}

                        {item.priority && (
                          <span
                            className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold ${priorityConfig.badgeClass}`}
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
                          className="rounded border border-[#202622] bg-[#080a09] px-2 py-0.5 font-mono text-[10px] font-medium text-[#9ca3af] transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
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
          <div className="hidden lg:block w-[360px] shrink-0 h-full">
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
            />
          </div>

          {/* TABLET / MOBILE OVERLAY DRAWER (< lg screens) */}
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <button
              type="button"
              aria-label="Close inspector"
              onClick={() => setSelectedWorkItemId(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            />
            <div className="relative ml-auto flex w-[360px] max-w-[85%] flex-col bg-[#080a09] shadow-2xl h-full">
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
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};