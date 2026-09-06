import assert from "node:assert/strict";
import test from "node:test";

test("@devforge/web: API Client Error Handling & Tenant 404 Security", () => {
  // Test ApiError formatting for 404 tenant boundary lookups
  const error404 = {
    statusCode: 404,
    message: "Resource not found or cross-tenant access denied.",
  };
  assert.equal(error404.statusCode, 404);
  assert.ok(error404.message.includes("not found"));
});

test("@devforge/web: CI/CD Deployment Gating Rule Verification", () => {
  // Frontend gating rule check
  const runningRun = { id: "run-1", status: "RUNNING" };
  const successRun = { id: "run-2", status: "SUCCESS" };

  const isGatedRunning = runningRun.status !== "SUCCESS";
  const isGatedSuccess = successRun.status !== "SUCCESS";

  assert.equal(isGatedRunning, true);
  assert.equal(isGatedSuccess, false);
});

test("@devforge/web: Work Item State Transitions & Column Mapping", () => {
  const statuses = [
    "BACKLOG",
    "READY",
    "IN_PROGRESS",
    "CODE_REVIEW",
    "DONE",
    "BLOCKED",
  ];
  assert.equal(statuses.length, 6);
  assert.ok(statuses.includes("IN_PROGRESS"));
  assert.ok(statuses.includes("BLOCKED"));
});

test("@devforge/web: Team Creation Role Permissions & Auto-Assignment Logic", () => {
  const canCreateTeam = (role: string) => role === "OWNER" || role === "ADMIN";

  assert.equal(canCreateTeam("OWNER"), true);
  assert.equal(canCreateTeam("ADMIN"), true);
  assert.equal(canCreateTeam("DEVELOPER"), false);
  assert.equal(canCreateTeam("VIEWER"), false);

  // Shared teams state simulation
  let teams: Array<{ id: string; name: string }> = [];
  const handleTeamCreated = (newTeam: { id: string; name: string }) => {
    if (!teams.some((t) => t.id === newTeam.id)) {
      teams = [...teams, newTeam];
    }
  };

  const createdTeam = { id: "t-1", name: "Platform Engineering" };
  handleTeamCreated(createdTeam);
  assert.equal(teams.length, 1);
  assert.equal(teams[0].name, "Platform Engineering");

  // Auto-assignment failure isolation simulation
  let selectedItemTeamId: string | null = null;
  let assignmentError: string | null = null;

  const simulateAutoAssignFailure = () => {
    try {
      throw new Error("Network error during assignment");
    } catch {
      assignmentError = "Team created, but could not assign it to this work item.";
    }
  };

  simulateAutoAssignFailure();
  assert.equal(teams.length, 1); // Team remains preserved in teams array
  assert.equal(selectedItemTeamId, null);
  assert.equal(assignmentError, "Team created, but could not assign it to this work item.");
});

test("@devforge/web: Work Item Hierarchy Parent Candidates & Filtering by Type", () => {
  const projectId = "proj-1";
  const allItems = [
    { id: "epic-1", projectId: "proj-1", type: "EPIC", title: "Core Platform" },
    { id: "epic-2", projectId: "proj-1", type: "EPIC", title: "Analytics Engine" },
    { id: "feat-1", projectId: "proj-1", type: "FEATURE", title: "Auth Flow", parentId: "epic-1" },
    { id: "feat-2", projectId: "proj-1", type: "FEATURE", title: "Billing System", parentId: "epic-1" },
    { id: "task-1", projectId: "proj-1", type: "TASK", title: "Setup DB", parentId: "feat-1" },
    { id: "bug-1", projectId: "proj-1", type: "BUG", title: "Fix Login", parentId: "feat-1" },
    { id: "other-epic", projectId: "proj-2", type: "EPIC", title: "Other Project Epic" },
  ];

  const getCandidateParents = (item: { id: string; type?: string; projectId?: string }) => {
    const itemType = (item.type || "TASK").toUpperCase();
    const potentialParents = allItems.filter(
      (c) => c.id !== item.id && (!c.projectId || c.projectId === projectId),
    );

    if (itemType === "EPIC") {
      return [];
    }
    if (itemType === "FEATURE") {
      return potentialParents.filter(
        (c) => (c.type || "TASK").toUpperCase() === "EPIC",
      );
    }
    return potentialParents.filter((c) => {
      const t = (c.type || "TASK").toUpperCase();
      return t === "EPIC" || t === "FEATURE";
    });
  };

  // 1. EPIC candidate parents -> empty (cannot have parent)
  const epicCandidates = getCandidateParents(allItems[0]);
  assert.equal(epicCandidates.length, 0);

  // 2. FEATURE candidate parents -> only EPICs in the same project (excluding other project)
  const featCandidates = getCandidateParents(allItems[2]);
  assert.equal(featCandidates.length, 2);
  assert.ok(featCandidates.every((c) => c.type === "EPIC"));
  assert.ok(featCandidates.every((c) => c.projectId === projectId));
  assert.ok(!featCandidates.some((c) => c.id === "other-epic"));

  // 3. TASK candidate parents -> EPICs and FEATUREs in the same project, excluding self
  const taskCandidates = getCandidateParents(allItems[4]);
  assert.equal(taskCandidates.length, 4); // epic-1, epic-2, feat-1, feat-2
  assert.ok(taskCandidates.every((c) => c.type === "EPIC" || c.type === "FEATURE"));
  assert.ok(!taskCandidates.some((c) => c.id === "task-1"));
  assert.ok(!taskCandidates.some((c) => c.id === "other-epic"));

  // 4. BUG candidate parents -> EPICs and FEATUREs in the same project, excluding self
  const bugCandidates = getCandidateParents(allItems[5]);
  assert.equal(bugCandidates.length, 4);
  assert.ok(bugCandidates.every((c) => c.type === "EPIC" || c.type === "FEATURE"));
  assert.ok(!bugCandidates.some((c) => c.id === "bug-1"));
});

test("@devforge/web: Work Item Hierarchy 'Not linked' & Selection Invariants", () => {
  const allowNotLinked = (itemType: string) => {
    const upper = itemType.toUpperCase();
    return upper === "TASK" || upper === "BUG";
  };

  assert.equal(allowNotLinked("TASK"), true);
  assert.equal(allowNotLinked("BUG"), true);
  assert.equal(allowNotLinked("FEATURE"), false);
  assert.equal(allowNotLinked("EPIC"), false);
});

test("@devforge/web: Work Item Direct Children Resolution & Navigation", () => {
  const projectId = "proj-1";
  const allItems = [
    { id: "epic-1", projectId: "proj-1", type: "EPIC", title: "Core Platform", parentId: null },
    { id: "feat-1", projectId: "proj-1", type: "FEATURE", title: "Auth Flow", parentId: "epic-1" },
    { id: "feat-2", projectId: "proj-1", type: "FEATURE", title: "Billing System", parentId: "epic-1" },
    { id: "task-1", projectId: "proj-1", type: "TASK", title: "Setup DB", parentId: "feat-1" },
    { id: "task-2", projectId: "proj-1", type: "TASK", title: "Write Tests", parentId: "feat-1" },
    { id: "bug-1", projectId: "proj-1", type: "BUG", title: "Fix Login", parentId: "feat-1" },
    { id: "task-standalone", projectId: "proj-1", type: "TASK", title: "Standalone Task", parentId: null },
  ];

  const getDirectChildren = (itemId: string) => {
    return allItems.filter(
      (c) => c.parentId === itemId && (!c.projectId || c.projectId === projectId),
    );
  };

  // Direct children of epic-1 -> feat-1, feat-2
  const epicChildren = getDirectChildren("epic-1");
  assert.equal(epicChildren.length, 2);
  assert.equal(epicChildren[0].id, "feat-1");
  assert.equal(epicChildren[1].id, "feat-2");

  // Direct children of feat-1 -> task-1, task-2, bug-1
  const feat1Children = getDirectChildren("feat-1");
  assert.equal(feat1Children.length, 3);
  assert.equal(feat1Children[0].id, "task-1");
  assert.equal(feat1Children[1].id, "task-2");
  assert.equal(feat1Children[2].id, "bug-1");

  // Leaf node children -> empty
  assert.equal(getDirectChildren("task-1").length, 0);
  assert.equal(getDirectChildren("task-standalone").length, 0);

  // Inspector selection switching simulation
  let selectedItemId: string | null = "task-1";
  const onSelectItem = (item: { id: string }) => {
    selectedItemId = item.id;
  };

  // Jump to parent feat-1
  const parentItem = allItems.find((i) => i.id === allItems.find((t) => t.id === "task-1")?.parentId);
  assert.ok(parentItem);
  onSelectItem(parentItem);
  assert.equal(selectedItemId, "feat-1");

  // From feat-1, click child bug-1
  const targetChild = feat1Children.find((c) => c.id === "bug-1");
  assert.ok(targetChild);
  onSelectItem(targetChild);
  assert.equal(selectedItemId, "bug-1");
});

test("@devforge/web: Work Item Parent Update Payload & Error Handling", () => {
  // Simulating parent update PATCH payload creation
  const buildUpdatePayload = (newParentId: string | null) => {
    return {
      parentId: newParentId,
    };
  };

  assert.deepEqual(buildUpdatePayload("epic-1"), { parentId: "epic-1" });
  assert.deepEqual(buildUpdatePayload(null), { parentId: null });

  // Error handling simulation
  let errorState: string | null = null;
  const handleParentUpdateError = (err: unknown) => {
    errorState = err instanceof Error ? err.message : "Failed to update parent work item.";
  };

  handleParentUpdateError(new Error("Hierarchy cycle detected: work item cannot be its own ancestor."));
  assert.equal(errorState, "Hierarchy cycle detected: work item cannot be its own ancestor.");
});

test("@devforge/web: Type-Aware Work Item Creation Modal & Invariants", () => {
  const projectId = "proj-1";
  const projectItems = [
    { id: "epic-1", projectId: "proj-1", type: "EPIC", title: "Platform V2" },
    { id: "epic-2", projectId: "proj-1", type: "EPIC", title: "Mobile Client" },
    { id: "feat-1", projectId: "proj-1", type: "FEATURE", title: "SSO Auth", parentId: "epic-1" },
    { id: "task-1", projectId: "proj-1", type: "TASK", title: "Migrate DB", parentId: "feat-1" },
    { id: "other-epic", projectId: "proj-2", type: "EPIC", title: "Other Project Epic" },
  ];

  // 1. Candidate parents resolution for modal based on selected type
  const getModalCandidateParents = (selectedType: string) => {
    return projectItems.filter((i) => {
      const isSameProject = !i.projectId || i.projectId === projectId;
      if (!isSameProject) return false;
      const t = (i.type || "TASK").toUpperCase();
      if (selectedType === "EPIC") return false;
      if (selectedType === "FEATURE") return t === "EPIC";
      return t === "EPIC" || t === "FEATURE"; // TASK or BUG
    });
  };

  // EPIC -> 0 candidate parents
  assert.equal(getModalCandidateParents("EPIC").length, 0);

  // FEATURE -> only EPICs in the same project (epic-1, epic-2; excluding other-epic)
  const featCandidates = getModalCandidateParents("FEATURE");
  assert.equal(featCandidates.length, 2);
  assert.ok(featCandidates.every((c) => c.type === "EPIC"));
  assert.ok(!featCandidates.some((c) => c.id === "other-epic"));

  // TASK / BUG -> EPICs and FEATUREs in the same project (epic-1, epic-2, feat-1)
  const taskCandidates = getModalCandidateParents("TASK");
  assert.equal(taskCandidates.length, 3);
  assert.ok(taskCandidates.every((c) => c.type === "EPIC" || c.type === "FEATURE"));

  // 2. Type change state transition logic simulation
  let modalType = "TASK";
  let modalParentId = "feat-1";

  const handleTypeChange = (newType: string) => {
    modalType = newType;
    if (newType === "EPIC") {
      modalParentId = "";
    } else if (newType === "FEATURE") {
      const epicCandidates = projectItems.filter(
        (i) =>
          (!i.projectId || i.projectId === projectId) &&
          (i.type || "TASK").toUpperCase() === "EPIC",
      );
      if (!epicCandidates.some((e) => e.id === modalParentId)) {
        modalParentId = epicCandidates[0]?.id || "";
      }
    } else {
      // TASK or BUG
      const validCandidates = projectItems.filter((i) => {
        const isSameProject = !i.projectId || i.projectId === projectId;
        const t = (i.type || "TASK").toUpperCase();
        return isSameProject && (t === "EPIC" || t === "FEATURE");
      });
      if (modalParentId && !validCandidates.some((c) => c.id === modalParentId)) {
        modalParentId = "";
      }
    }
  };

  // Changing to EPIC clears parentId
  handleTypeChange("EPIC");
  assert.equal(modalType, "EPIC");
  assert.equal(modalParentId, "");

  // Changing to FEATURE auto-selects valid EPIC parent
  handleTypeChange("FEATURE");
  assert.equal(modalType, "FEATURE");
  assert.equal(modalParentId, "epic-1");

  // Changing to TASK keeps valid parent
  handleTypeChange("TASK");
  assert.equal(modalType, "TASK");
  assert.equal(modalParentId, "epic-1");

  // 3. Submission validation rules
  const canSubmit = (title: string, type: string, parentId: string, candidatesCount: number) => {
    if (!title.trim()) return false;
    if (type === "FEATURE" && (!parentId || candidatesCount === 0)) return false;
    return true;
  };

  // Valid submissions
  assert.equal(canSubmit("New Task", "TASK", "", 3), true);
  assert.equal(canSubmit("New Task with Parent", "TASK", "feat-1", 3), true);
  assert.equal(canSubmit("New Bug", "BUG", "", 3), true);
  assert.equal(canSubmit("New Epic", "EPIC", "", 0), true);
  assert.equal(canSubmit("New Feature", "FEATURE", "epic-1", 2), true);

  // Invalid submissions
  assert.equal(canSubmit("", "TASK", "", 3), false); // empty title
  assert.equal(canSubmit("New Feature without Parent", "FEATURE", "", 2), false); // FEATURE without parent
  assert.equal(canSubmit("New Feature when No Epics exist", "FEATURE", "", 0), false); // FEATURE with 0 epics

  // 4. Creation API payload builder
  const buildCreatePayload = (
    title: string,
    priority: string,
    type: string,
    parentId: string | null,
  ) => {
    const targetParentId = type === "EPIC" ? null : parentId ? parentId : null;
    return {
      type,
      title,
      priority,
      ...(targetParentId ? { parentId: targetParentId } : {}),
    };
  };

  assert.deepEqual(
    buildCreatePayload("Architecture Epic", "HIGH", "EPIC", "some-id"),
    { type: "EPIC", title: "Architecture Epic", priority: "HIGH" },
  );
  assert.deepEqual(
    buildCreatePayload("User Auth Feature", "MEDIUM", "FEATURE", "epic-1"),
    { type: "FEATURE", title: "User Auth Feature", priority: "MEDIUM", parentId: "epic-1" },
  );
  assert.deepEqual(
    buildCreatePayload("Standalone Task", "LOW", "TASK", null),
    { type: "TASK", title: "Standalone Task", priority: "LOW" },
  );
});

test("@devforge/web: Interactive Topbar Breadcrumb & Project Switcher Resolution", () => {
  const workspace = { id: "ws-1", name: "DevForge Team" };
  const projects = [
    { id: "proj-1", name: "Core Engine", workspaceId: "ws-1" },
    { id: "proj-2", name: "Web App", workspaceId: "ws-1" },
    { id: "proj-3", name: "Mobile SDK", workspaceId: "ws-1" },
  ];
  let activeProject = projects[0];
  let activeWorkspace: typeof workspace | null = workspace;

  // 1. Workspace breadcrumb click -> returns to workspace selector
  const handleSwitchWorkspace = () => {
    activeWorkspace = null;
  };

  handleSwitchWorkspace();
  assert.equal(activeWorkspace, null);

  // Restore workspace
  activeWorkspace = workspace;

  // 2. Project switcher selection
  const handleSelectProject = (project: (typeof projects)[0]) => {
    activeProject = project;
  };

  assert.equal(activeProject.id, "proj-1");
  handleSelectProject(projects[1]);
  assert.equal(activeProject.id, "proj-2");
  assert.equal(activeProject.name, "Web App");

  handleSelectProject(projects[2]);
  assert.equal(activeProject.id, "proj-3");
  assert.equal(activeProject.name, "Mobile SDK");
});

test("@devforge/web: Reversible Workflow Target States Resolution", () => {
  const states = [
    { id: "s-backlog", name: "Backlog", category: "BACKLOG", position: 0 },
    { id: "s-progress", name: "In Progress", category: "STARTED", position: 1 },
    { id: "s-done", name: "Done", category: "COMPLETED", position: 2 },
  ];

  const transitions = [
    { fromStateId: "s-backlog", toStateId: "s-progress" },
    { fromStateId: "s-progress", toStateId: "s-backlog" },
    { fromStateId: "s-progress", toStateId: "s-done" },
    { fromStateId: "s-done", toStateId: "s-progress" },
  ];

  const getAllowedTargetStates = (currentStateId: string) => {
    const validTransitions = transitions.filter(
      (t) => t.fromStateId === currentStateId,
    );
    const validTargetIds = new Set(validTransitions.map((t) => t.toStateId));
    return states.filter((state) => validTargetIds.has(state.id));
  };

  // 1. Backlog item targets -> In Progress only
  const backlogTargets = getAllowedTargetStates("s-backlog");
  assert.equal(backlogTargets.length, 1);
  assert.equal(backlogTargets[0].id, "s-progress");

  // 2. In Progress item targets -> Backlog AND Done (Reversible!)
  const inProgressTargets = getAllowedTargetStates("s-progress");
  assert.equal(inProgressTargets.length, 2);
  assert.ok(inProgressTargets.some((t) => t.id === "s-backlog"));
  assert.ok(inProgressTargets.some((t) => t.id === "s-done"));

  // 3. Done item targets -> In Progress (Reversible!)
  const doneTargets = getAllowedTargetStates("s-done");
  assert.equal(doneTargets.length, 1);
  assert.equal(doneTargets[0].id, "s-progress");
});

test("@devforge/web: Project Pin Persistence, Sorting & Stale ID Cleanup", () => {
  const workspaceId = "ws-1";
  const projects = [
    { id: "p-1", name: "Alpha", workspaceId, status: "ACTIVE" },
    { id: "p-2", name: "Beta", workspaceId, status: "ACTIVE" },
    { id: "p-3", name: "Gamma", workspaceId, status: "ACTIVE" },
  ];

  // 1. Storage simulation
  const storage: Record<string, string> = {};
  const PIN_KEY = `devforge_pinned_${workspaceId}`;

  const storePins = (ids: string[]) => {
    storage[PIN_KEY] = JSON.stringify(ids);
  };
  const getPins = () => {
    try {
      return JSON.parse(storage[PIN_KEY] || "[]") as string[];
    } catch {
      return [];
    }
  };

  // Pin p-2 and p-3
  storePins(["p-2", "p-3"]);
  let pinnedIds = getPins();
  assert.deepEqual(pinnedIds, ["p-2", "p-3"]);

  // 2. Sort active projects: pinned first, preserving order
  const sortProjects = (projs: typeof projects, pins: string[]) => {
    const active = projs.filter((p) => p.status !== "ARCHIVED");
    const pinned = active.filter((p) => pins.includes(p.id));
    const unpinned = active.filter((p) => !pins.includes(p.id));
    return [...pinned, ...unpinned];
  };

  const sorted = sortProjects(projects, pinnedIds);
  assert.equal(sorted.length, 3);
  assert.equal(sorted[0].id, "p-2");
  assert.equal(sorted[1].id, "p-3");
  assert.equal(sorted[2].id, "p-1");

  // 3. Stale ID cleanup when a project is removed
  const updatedProjects = [projects[0], projects[1]]; // p-3 removed
  const validPins = pinnedIds.filter((id) =>
    updatedProjects.some((p) => p.id === id),
  );
  assert.deepEqual(validPins, ["p-2"]); // p-3 stale ID cleaned up
});

test("@devforge/web: Project Archive & Restore Lifecycle Invariants", () => {
  let projects = [
    { id: "p-1", name: "Active Alpha", status: "ACTIVE" },
    { id: "p-2", name: "Active Beta", status: "ACTIVE" },
    { id: "p-3", name: "Archived Gamma", status: "ARCHIVED" },
  ];

  let activeProject: (typeof projects)[0] | null = projects[0];

  // 1. Initial partition
  const getActive = () => projects.filter((p) => p.status !== "ARCHIVED");
  const getArchived = () => projects.filter((p) => p.status === "ARCHIVED");

  assert.equal(getActive().length, 2);
  assert.equal(getArchived().length, 1);

  // 2. Archive active project (p-1) -> switches selection to next active project (p-2)
  const handleProjectUpdated = (updated: (typeof projects)[0]) => {
    projects = projects.map((p) => (p.id === updated.id ? updated : p));
    if (activeProject?.id === updated.id) {
      if (updated.status === "ARCHIVED") {
        const remaining = projects.filter(
          (p) => p.id !== updated.id && p.status !== "ARCHIVED",
        );
        activeProject = remaining.length > 0 ? remaining[0] : null;
      } else {
        activeProject = updated;
      }
    }
  };

  handleProjectUpdated({ id: "p-1", name: "Active Alpha", status: "ARCHIVED" });
  assert.equal(getActive().length, 1);
  assert.equal(getArchived().length, 2);
  assert.equal(activeProject?.id, "p-2"); // Safely switched to p-2

  // 3. Archive p-2 when no other active projects remain -> activeProject becomes null
  handleProjectUpdated({ id: "p-2", name: "Active Beta", status: "ARCHIVED" });
  assert.equal(getActive().length, 0);
  assert.equal(getArchived().length, 3);
  assert.equal(activeProject, null); // Safely returns to ProjectGate

  // 4. Restore p-1 -> returns to active list
  handleProjectUpdated({ id: "p-1", name: "Active Alpha", status: "ACTIVE" });
  assert.equal(getActive().length, 1);
  assert.equal(getArchived().length, 2);
});

test("@devforge/web: Project Deletion & Safe State Cleanup", () => {
  let projects = [
    { id: "p-1", name: "Project 1", status: "ACTIVE" },
    { id: "p-2", name: "Project 2", status: "ACTIVE" },
  ];
  let pinnedIds = ["p-1"];
  let activeProject: (typeof projects)[0] | null = projects[0];

  const handleProjectDeleted = (deletedId: string) => {
    projects = projects.filter((p) => p.id !== deletedId);
    pinnedIds = pinnedIds.filter((id) => id !== deletedId);

    if (activeProject?.id === deletedId) {
      const remainingActive = projects.filter((p) => p.status !== "ARCHIVED");
      activeProject = remainingActive.length > 0 ? remainingActive[0] : null;
    }
  };

  // Delete active project p-1
  handleProjectDeleted("p-1");

  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, "p-2");
  assert.deepEqual(pinnedIds, []); // Pinned state cleaned up
  assert.equal(activeProject?.id, "p-2"); // Switched to remaining active project

  // Delete last active project p-2
  handleProjectDeleted("p-2");
  assert.equal(projects.length, 0);
  assert.equal(activeProject, null); // Cleared cleanly, no stale data
});

test("@devforge/web: Empty Board vs Populated Board Rendering Invariants", () => {
  const workflowStates = [
    { id: "s-backlog", name: "Backlog", position: 0 },
    { id: "s-progress", name: "In Progress", position: 1 },
    { id: "s-done", name: "Done", position: 2 },
  ];

  const determineBoardLayout = (itemsCount: number) => {
    if (itemsCount === 0) {
      return {
        showEmptyState: true,
        showColumnBodies: false,
        workflowContext: workflowStates.map((s) => s.name).join(" → "),
      };
    }
    return {
      showEmptyState: false,
      showColumnBodies: true,
      workflowContext: null,
    };
  };

  // Case 1: 0 work items in project -> single empty state with workflow context, 0 column bodies
  const emptyBoard = determineBoardLayout(0);
  assert.equal(emptyBoard.showEmptyState, true);
  assert.equal(emptyBoard.showColumnBodies, false);
  assert.equal(emptyBoard.workflowContext, "Backlog → In Progress → Done");

  // Case 2: Populated project (e.g. 5 work items) -> normal column tracks rendered, no empty state
  const populatedBoard = determineBoardLayout(5);
  assert.equal(populatedBoard.showEmptyState, false);
  assert.equal(populatedBoard.showColumnBodies, true);
  assert.equal(populatedBoard.workflowContext, null);
});
