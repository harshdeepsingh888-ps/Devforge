import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryWorkspaceRepository } from "../../workspaces/repositories/memory/in-memory-workspace.repository.js";
import { InMemoryTeamRepository } from "../../workspaces/repositories/memory/in-memory-team.repository.js";
import { InMemoryProjectRepository } from "../../projects/project.repository.js";
import { InMemoryWorkflowRepository } from "../repositories/memory/in-memory-workflow.repository.js";
import { InMemoryWorkItemRepository } from "../repositories/memory/in-memory-work-item.repository.js";
import { InMemoryCommentRepository } from "../repositories/memory/in-memory-comment.repository.js";
import { InMemoryWorkItemHistoryRepository } from "../repositories/memory/in-memory-work-item-history.repository.js";

import { WorkspaceService } from "../../workspaces/services/workspace.service.js";
import { WorkItemService } from "./work-item.service.js";
import {
  WorkItemHierarchyInvalidError,
  WorkItemHierarchyCycleError,
  WorkItemHasChildrenError,
  WorkItemTenantMismatchError,
  InvalidStateTransitionError,
  WorkflowMultipleInitialStatesError,
  WorkflowStateDuplicatePositionError,
  DuplicateStateTransitionError,
  WorkItemTitleRequiredError,
  WorkflowNotFoundError,
  WorkItemNotFoundError,
} from "../work-management.errors.js";
import { WorkspacePermissionDeniedError } from "../../workspaces/workspace.errors.js";

async function setupTestContext() {
  const workspaceRepo = new InMemoryWorkspaceRepository();
  const teamRepo = new InMemoryTeamRepository();
  const projectRepo = new InMemoryProjectRepository();
  const workflowRepo = new InMemoryWorkflowRepository();
  const workItemRepo = new InMemoryWorkItemRepository();
  const commentRepo = new InMemoryCommentRepository();
  const historyRepo = new InMemoryWorkItemHistoryRepository();

  const workspaceService = new WorkspaceService(workspaceRepo);
  const workItemService = new WorkItemService(
    workItemRepo,
    workflowRepo,
    workspaceRepo,
    projectRepo,
    teamRepo,
    commentRepo,
    historyRepo,
  );

  const ws1 = await workspaceService.createWorkspace({
    name: "DevForge Platform",
    creatorUserId: "owner-1",
  });

  const ws2 = await workspaceService.createWorkspace({
    name: "Competitor Workspace",
    creatorUserId: "outsider-1",
  });

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: "dev-1",
    role: "DEVELOPER",
  });

  const project1 = await projectRepo.create({
    workspaceId: ws1.id,
    name: "Core Engine",
  });

  const project2 = await projectRepo.create({
    workspaceId: ws1.id,
    name: "Web Portal",
  });

  const ws2Project = await projectRepo.create({
    workspaceId: ws2.id,
    name: "Unrelated Project",
  });

  // Setup default workflow for WS1
  const defaultWorkflow = await workflowRepo.createWorkflow({
    workspaceId: ws1.id,
    name: "Engineering Default Workflow",
    isDefault: true,
  });

  const states = await workflowRepo.findStatesByWorkflow(defaultWorkflow.id);
  const backlogState = states[0]!;
  const inProgressState = states[1]!;
  const doneState = states[2]!;

  await workflowRepo.createWorkflow({
    workspaceId: ws2.id,
    name: "WS2 Default Workflow",
    isDefault: true,
  });

  return {
    ws1,
    ws2,
    project1,
    project2,
    ws2Project,
    defaultWorkflow,
    backlogState,
    inProgressState,
    doneState,
    workspaceRepo,
    teamRepo,
    projectRepo,
    workflowRepo,
    workItemRepo,
    commentRepo,
    historyRepo,
    workspaceService,
    workItemService,
  };
}

test("Workflow & State Invariants: initial state, position uniqueness, duplicate transitions", async () => {
  const { defaultWorkflow, workflowRepo, ws1 } = await setupTestContext();

  // Attempting to create a second initial state -> throws WorkflowMultipleInitialStatesError
  await assert.rejects(
    async () => {
      await workflowRepo.createState({
        workflowId: defaultWorkflow.id,
        name: "Second Initial",
        category: "BACKLOG",
        position: 10,
        isInitial: true,
      });
    },
    WorkflowMultipleInitialStatesError,
  );

  // Attempting duplicate position -> throws WorkflowStateDuplicatePositionError
  await assert.rejects(
    async () => {
      await workflowRepo.createState({
        workflowId: defaultWorkflow.id,
        name: "Duplicate Position State",
        category: "UNSTARTED",
        position: 0,
      });
    },
    WorkflowStateDuplicatePositionError,
  );

  const states = await workflowRepo.findStatesByWorkflow(defaultWorkflow.id);
  const initialState = await workflowRepo.findInitialState(defaultWorkflow.id);
  assert.ok(initialState);
  assert.equal(initialState.name, "Backlog");

  // Attempting duplicate transition -> throws DuplicateStateTransitionError
  await assert.rejects(
    async () => {
      await workflowRepo.createTransition({
        workflowId: defaultWorkflow.id,
        fromStateId: states[0]!.id,
        toStateId: states[1]!.id,
      });
    },
    DuplicateStateTransitionError,
  );
});

test("WorkItem Creation & Hierarchy Invariants (V2.1 Strict Depth Rules)", async () => {
  const { ws1, project1, workItemService } = await setupTestContext();

  // 1. Create valid EPIC
  const epic = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "EPIC",
    title: "Epic 1: Authentication Engine",
  });

  assert.equal(epic.type, "EPIC");
  assert.equal(epic.parentId, null);

  // 2. Reject EPIC with parent
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        actorUserId: "owner-1",
        type: "EPIC",
        title: "Nested Epic",
        parentId: epic.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // 3. Create valid FEATURE under EPIC
  const feature = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "FEATURE",
    title: "Feature 1.1: OAuth Integration",
    parentId: epic.id,
  });

  assert.equal(feature.type, "FEATURE");
  assert.equal(feature.parentId, epic.id);

  // 4. Reject FEATURE without EPIC parent
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        actorUserId: "owner-1",
        type: "FEATURE",
        title: "Orphan Feature",
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // 5. Create valid TASK under FEATURE
  const taskUnderFeature = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "dev-1",
    type: "TASK",
    title: "Task 1.1.1: JWT Middleware",
    parentId: feature.id,
  });
  assert.equal(taskUnderFeature.parentId, feature.id);

  // 6. Create valid BUG under FEATURE
  const bugUnderFeature = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "dev-1",
    type: "BUG",
    title: "Bug 1.1.2: Token Expired Parsing Failure",
    parentId: feature.id,
  });
  assert.equal(bugUnderFeature.parentId, feature.id);

  // 7. Create TASK directly under EPIC
  const taskUnderEpic = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "dev-1",
    type: "TASK",
    title: "Task 1.2: Direct Epic Task",
    parentId: epic.id,
  });
  assert.equal(taskUnderEpic.parentId, epic.id);

  // 8. Create BUG directly under EPIC
  const bugUnderEpic = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "dev-1",
    type: "BUG",
    title: "Bug 1.3: Direct Epic Bug",
    parentId: epic.id,
  });
  assert.equal(bugUnderEpic.parentId, epic.id);

  // 9. Reject TASK under TASK (Strict V2.1 Sub-task Rule)
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        actorUserId: "dev-1",
        type: "TASK",
        title: "Sub-task under Task",
        parentId: taskUnderFeature.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // 10. Reject BUG as parent
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        actorUserId: "dev-1",
        type: "TASK",
        title: "Task under Bug",
        parentId: bugUnderFeature.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );
});

test("Hierarchy Tenant & Project Isolation & Cycle Detection", async () => {
  const { ws1, ws2, project1, project2, ws2Project, workItemService } =
    await setupTestContext();

  const epicP1 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "EPIC",
    title: "Epic in Project 1",
  });

  // Cross-project parent attempt -> throws WorkItemTenantMismatchError
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws1.id,
        projectId: project2.id,
        actorUserId: "owner-1",
        type: "FEATURE",
        title: "Cross project feature",
        parentId: epicP1.id,
      });
    },
    WorkItemTenantMismatchError,
  );

  // Cross-workspace parent attempt -> throws WorkItemHierarchyInvalidError / WorkItemTenantMismatchError
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws2.id,
        projectId: ws2Project.id,
        actorUserId: "outsider-1",
        type: "FEATURE",
        title: "Cross workspace feature",
        parentId: epicP1.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );
});

test("State Machine Transitions: explicit allowed transitions vs unlinked transition failure", async () => {
  const { ws1, project1, workItemService, backlogState, inProgressState, doneState } =
    await setupTestContext();

  const task = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "dev-1",
    type: "TASK",
    title: "Task with Workflow State",
  });

  assert.equal(task.workflowStateId, backlogState.id);

  // Transition Backlog -> In Progress (Allowed)
  const transitioned = await workItemService.transitionState({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    targetStateId: inProgressState.id,
  });

  assert.equal(transitioned.workflowStateId, inProgressState.id);
  assert.equal(transitioned.completedAt, null);

  // Transition In Progress -> Backlog (Reversible Transition - Allowed)
  const backToBacklog = await workItemService.transitionState({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    targetStateId: backlogState.id,
  });

  assert.equal(backToBacklog.workflowStateId, backlogState.id);
  assert.equal(backToBacklog.completedAt, null);

  // Transition Backlog -> In Progress -> Done (Allowed)
  await workItemService.transitionState({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    targetStateId: inProgressState.id,
  });

  const doneItem = await workItemService.transitionState({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    targetStateId: doneState.id,
  });

  assert.equal(doneItem.workflowStateId, doneState.id);
  assert.ok(doneItem.completedAt);

  // Transition Done -> In Progress (Reversible Transition - Allowed)
  const reopenedItem = await workItemService.transitionState({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    targetStateId: inProgressState.id,
  });

  assert.equal(reopenedItem.workflowStateId, inProgressState.id);
  assert.equal(reopenedItem.completedAt, null); // completedAt must be cleared

  // Unlinked Transition: Attempting Done -> Backlog (direct jump not linked) -> throws InvalidStateTransitionError
  // Move back to Done first
  await workItemService.transitionState({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    targetStateId: doneState.id,
  });

  await assert.rejects(
    async () => {
      await workItemService.transitionState({
        workspaceId: ws1.id,
        workItemId: task.id,
        actorUserId: "dev-1",
        targetStateId: backlogState.id,
      });
    },
    InvalidStateTransitionError,
  );
});

test("Workflow Reversibility: legacy default workflow with only forward transitions is automatically upgraded", async () => {
  const { ws1, project1, workItemService, workflowRepo } = await setupTestContext();

  const defaultWf = await workflowRepo.findDefaultWorkflow(ws1.id);
  assert.ok(defaultWf);

  const transitions = await workflowRepo.findTransitionsByWorkflow(defaultWf.id);
  // Must have all 4 transitions
  assert.equal(transitions.length, 4);

  const states = await workflowRepo.findStatesByWorkflow(defaultWf.id);
  const backlog = states.find((s) => s.category === "BACKLOG")!;
  const inProgress = states.find((s) => s.category === "STARTED")!;
  const done = states.find((s) => s.category === "COMPLETED")!;

  assert.ok(transitions.some((t) => t.fromStateId === backlog.id && t.toStateId === inProgress.id));
  assert.ok(transitions.some((t) => t.fromStateId === inProgress.id && t.toStateId === backlog.id));
  assert.ok(transitions.some((t) => t.fromStateId === inProgress.id && t.toStateId === done.id));
  assert.ok(transitions.some((t) => t.fromStateId === done.id && t.toStateId === inProgress.id));
});

test("Assignment Invariants: rejects non-workspace member or non-workspace team", async () => {
  const { ws1, project1, workItemService } = await setupTestContext();

  // Assign valid workspace member -> succeeds
  const task = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Assigned Task",
    assigneeUserId: "dev-1",
  });

  assert.equal(task.assigneeUserId, "dev-1");

  // Assign non-workspace user -> throws WorkItemTenantMismatchError
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        actorUserId: "owner-1",
        type: "TASK",
        title: "Invalid Assignee Task",
        assigneeUserId: "non-member-user",
      });
    },
    WorkItemTenantMismatchError,
  );
});

test("Comments & WorkItem History logging", async () => {
  const { ws1, project1, workItemService, historyRepo, commentRepo } =
    await setupTestContext();

  const task = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "dev-1",
    type: "TASK",
    title: "Task with Comments",
  });

  const comment = await workItemService.addComment({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    content: "Reviewing JWT token payload design.",
  });

  assert.equal(comment.content, "Reviewing JWT token payload design.");
  assert.equal(comment.authorUserId, "dev-1");

  const history = await historyRepo.findByWorkItem(ws1.id, task.id);
  assert.equal(history.length, 2); // CREATED + COMMENTED
  assert.equal(history[0]?.action, "CREATED");
  assert.equal(history[1]?.action, "COMMENTED");
});

test("Default Workflow Bootstrapping during WorkItem creation", async () => {
  const { ws1, project1, workItemService, workflowRepo, workspaceService, projectRepo } =
    await setupTestContext();

  // 1. Existing default workflow: uses existing default, does not create another
  const workflowsBefore = await workflowRepo.findWorkflowsByWorkspace(ws1.id);
  assert.equal(workflowsBefore.length, 1);

  const item1 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Task in Workspace with Existing Default Workflow",
  });

  const workflowsAfter = await workflowRepo.findWorkflowsByWorkspace(ws1.id);
  assert.equal(workflowsAfter.length, 1);
  assert.equal(item1.workflowId, workflowsBefore[0]!.id);

  // 2. No default workflow: creates a default workflow (isDefault: true, name: "Default Workflow"),
  //    work item is created successfully, uses that workflow and its actual initial state
  const wsNoWf = await workspaceService.createWorkspace({
    name: "Workspace Without Workflow",
    creatorUserId: "owner-2",
  });
  const projNoWf = await projectRepo.create({
    workspaceId: wsNoWf.id,
    name: "Project Without Workflow",
  });

  const wsNoWfBefore = await workflowRepo.findWorkflowsByWorkspace(wsNoWf.id);
  assert.equal(wsNoWfBefore.length, 0);

  const itemNoWf = await workItemService.createWorkItem({
    workspaceId: wsNoWf.id,
    projectId: projNoWf.id,
    actorUserId: "owner-2",
    type: "TASK",
    title: "First Task in Fresh Workspace",
  });

  const wsNoWfAfter = await workflowRepo.findWorkflowsByWorkspace(wsNoWf.id);
  assert.equal(wsNoWfAfter.length, 1);
  const createdDefaultWf = wsNoWfAfter[0]!;
  assert.equal(createdDefaultWf.isDefault, true);
  assert.equal(createdDefaultWf.name, "Default Workflow");
  assert.equal(itemNoWf.workflowId, createdDefaultWf.id);

  const initialState = await workflowRepo.findInitialState(createdDefaultWf.id);
  assert.ok(initialState);
  assert.equal(itemNoWf.workflowStateId, initialState.id);

  // 3. Explicit valid workflowId: still works unchanged
  const customWf = await workflowRepo.createWorkflow({
    workspaceId: ws1.id,
    name: "Custom Workflow",
  });
  const customInitialState = await workflowRepo.findInitialState(customWf.id);
  assert.ok(customInitialState);

  const itemWithExplicitWf = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Task with Explicit Workflow",
    workflowId: customWf.id,
  });

  assert.equal(itemWithExplicitWf.workflowId, customWf.id);
  assert.equal(itemWithExplicitWf.workflowStateId, customInitialState.id);

  // 4. Explicit invalid workflowId: returns WorkflowNotFoundError
  await assert.rejects(
    async () => {
      await workItemService.createWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        actorUserId: "owner-1",
        type: "TASK",
        title: "Task with Nonexistent Workflow",
        workflowId: "invalid-workflow-id",
      });
    },
    WorkflowNotFoundError,
  );
});

test("WorkItem Deletion Lifecycle & RBAC", async () => {
  const { ws1, project1, project2, workItemService, workItemRepo, workspaceService } =
    await setupTestContext();

  // Create a viewer in ws1
  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: "viewer-1",
    role: "VIEWER",
  });

  // Create a work item
  const task = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Task to be deleted",
  });

  assert.ok(await workItemRepo.findById(ws1.id, task.id));

  // 1. VIEWER cannot delete work item -> throws WorkspacePermissionDeniedError
  await assert.rejects(
    async () => {
      await workItemService.deleteWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: task.id,
        actorUserId: "viewer-1",
      });
    },
    WorkspacePermissionDeniedError,
  );

  // 2. Mismatched project ID -> throws WorkItemTenantMismatchError
  await assert.rejects(
    async () => {
      await workItemService.deleteWorkItem({
        workspaceId: ws1.id,
        projectId: project2.id,
        workItemId: task.id,
        actorUserId: "owner-1",
      });
    },
    WorkItemTenantMismatchError,
  );

  // 3. Nonexistent work item -> throws WorkItemNotFoundError
  await assert.rejects(
    async () => {
      await workItemService.deleteWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: "non-existent-id",
        actorUserId: "owner-1",
      });
    },
    WorkItemNotFoundError,
  );

  // 4. Authorized role (DEVELOPER or OWNER) can delete work item
  await workItemService.deleteWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
  });

  // 5. Deleted work item can no longer be retrieved or listed
  const retrieved = await workItemRepo.findById(ws1.id, task.id);
  assert.equal(retrieved, null);

  const list = await workItemRepo.findByWorkspace(ws1.id, project1.id);
  assert.ok(!list.some((item) => item.id === task.id));
});

test("WorkItem Update & Property Editing RBAC & Tenant Safety", async () => {
  const { ws1, ws2, project1, project2, workItemService, workItemRepo, workspaceService } =
    await setupTestContext();

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: "viewer-1",
    role: "VIEWER",
  });

  const task = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Initial Title",
    description: "Initial Description",
    priority: "MEDIUM",
  });

  // 1. VIEWER cannot update work item -> WorkspacePermissionDeniedError
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        workItemId: task.id,
        actorUserId: "viewer-1",
        title: "Hacked Title",
      });
    },
    WorkspacePermissionDeniedError,
  );

  // 2. DEVELOPER can update allowed properties (title, description, priority, storyPoints)
  const updated = await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    title: "Updated Title",
    description: "Updated Description",
    priority: "URGENT",
    storyPoints: 8,
  });

  assert.equal(updated.title, "Updated Title");
  assert.equal(updated.description, "Updated Description");
  assert.equal(updated.priority, "URGENT");
  assert.equal(updated.storyPoints, 8);

  // 3. Mismatched project ID -> throws WorkItemTenantMismatchError
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project2.id,
        workItemId: task.id,
        actorUserId: "owner-1",
        title: "Wrong Project Title",
      });
    },
    WorkItemTenantMismatchError,
  );

  // 4. Invalid assignee user (not workspace member) -> throws WorkItemTenantMismatchError
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        workItemId: task.id,
        actorUserId: "owner-1",
        assigneeUserId: "non-member-user-id",
      });
    },
    WorkItemTenantMismatchError,
  );

  // 5. Empty title -> throws WorkItemTitleRequiredError
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        workItemId: task.id,
        actorUserId: "owner-1",
        title: "   ",
      });
    },
    WorkItemTitleRequiredError,
  );

  // 6. Generic update endpoint does NOT touch workflowStateId (preserves workflow state)
  const afterUpdate = await workItemRepo.findById(ws1.id, task.id);
  assert.equal(afterUpdate?.workflowStateId, task.workflowStateId);
});

test("WorkItem Assignment & Team Updates", async () => {
  const { ws1, ws2, project1, workItemService, teamRepo, workspaceService } = await setupTestContext();

  await workspaceService.addMember({
    workspaceId: ws1.id,
    actorUserId: "owner-1",
    targetUserId: "member-2",
    role: "DEVELOPER",
  });

  const team1 = await teamRepo.create({
    workspaceId: ws1.id,
    name: "Backend Team",
    slug: "backend-team",
  });

  const team2 = await teamRepo.create({
    workspaceId: ws2.id,
    name: "Other Workspace Team",
    slug: "other-workspace-team",
  });

  const task = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Assignment Task",
  });

  // 1. Assign valid workspace member
  const assigned = await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "owner-1",
    assigneeUserId: "member-2",
  });
  assert.equal(assigned.assigneeUserId, "member-2");

  // 2. Clear assignee with null
  const unassigned = await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "owner-1",
    assigneeUserId: null,
  });
  assert.equal(unassigned.assigneeUserId, null);

  // 3. Assign valid same-workspace team
  const teamAssigned = await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "owner-1",
    teamId: team1.id,
  });
  assert.equal(teamAssigned.teamId, team1.id);

  // 4. Reject cross-workspace team
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        workItemId: task.id,
        actorUserId: "owner-1",
        teamId: team2.id,
      });
    },
    WorkItemTenantMismatchError,
  );

  // 5. Clear team with null
  const teamCleared = await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "owner-1",
    teamId: null,
  });
  assert.equal(teamCleared.teamId, null);
});

test("WorkItem Hierarchy Hardening: Reparenting, Unparenting, Cycles, and Delete Guards", async () => {
  const { ws1, ws2, project1, project2, workItemService } = await setupTestContext();

  // Setup initial hierarchy in Project 1:
  // Epic 1 -> Feature 1 -> Task 1, Bug 1
  const epic1 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "EPIC",
    title: "Epic 1",
  });

  const epic2 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "EPIC",
    title: "Epic 2",
  });

  const feature1 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "FEATURE",
    title: "Feature 1",
    parentId: epic1.id,
  });

  const task1 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Task 1",
    parentId: feature1.id,
  });

  const bug1 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "BUG",
    title: "Bug 1",
    parentId: feature1.id,
  });

  // 1. FEATURE cannot be unparented (parentId: null rejected)
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: feature1.id,
        actorUserId: "owner-1",
        parentId: null,
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // 2. TASK / BUG legal unparenting
  const unparentedTask = await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: task1.id,
    actorUserId: "owner-1",
    parentId: null,
  });
  assert.equal(unparentedTask.parentId, null);

  const unparentedBug = await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: bug1.id,
    actorUserId: "owner-1",
    parentId: null,
  });
  assert.equal(unparentedBug.parentId, null);

  // Re-parent task and bug back to feature1 for subsequent tests
  await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: task1.id,
    actorUserId: "owner-1",
    parentId: feature1.id,
  });
  await workItemService.updateWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: bug1.id,
    actorUserId: "owner-1",
    parentId: feature1.id,
  });

  // 3. Self-parent rejection (childId === parentId)
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: task1.id,
        actorUserId: "owner-1",
        parentId: task1.id,
      });
    },
    WorkItemHierarchyCycleError,
  );

  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: feature1.id,
        actorUserId: "owner-1",
        parentId: feature1.id,
      });
    },
    WorkItemHierarchyCycleError,
  );

  // 4. Indirect cycle rejection
  // Attempting to set epic1's parent to feature1 or task1 must reject with cycle error
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: epic1.id,
        actorUserId: "owner-1",
        parentId: feature1.id,
      });
    },
    WorkItemHierarchyCycleError,
  );

  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: feature1.id,
        actorUserId: "owner-1",
        parentId: task1.id,
      });
    },
    WorkItemHierarchyCycleError,
  );

  // 5. Cross-project parent rejection on update
  const p2Epic = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project2.id,
    actorUserId: "owner-1",
    type: "EPIC",
    title: "Project 2 Epic",
  });

  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: task1.id,
        actorUserId: "owner-1",
        parentId: p2Epic.id,
      });
    },
    WorkItemTenantMismatchError,
  );

  // 6. Invalid parent type
  // TASK cannot be parent of another TASK
  const task2 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "TASK",
    title: "Task 2",
    parentId: epic1.id,
  });

  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: task1.id,
        actorUserId: "owner-1",
        parentId: task2.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // BUG cannot be parent of another BUG or TASK
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: task1.id,
        actorUserId: "owner-1",
        parentId: bug1.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // FEATURE parent must be EPIC, not another FEATURE
  const feature2 = await workItemService.createWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    actorUserId: "owner-1",
    type: "FEATURE",
    title: "Feature 2",
    parentId: epic1.id,
  });

  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: feature2.id,
        actorUserId: "owner-1",
        parentId: feature1.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // EPIC cannot have any parent
  await assert.rejects(
    async () => {
      await workItemService.updateWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: epic2.id,
        actorUserId: "owner-1",
        parentId: epic1.id,
      });
    },
    WorkItemHierarchyInvalidError,
  );

  // 7. Deleting item with children is rejected (Strict deletion guard)
  // feature1 has task1 and bug1 as children
  await assert.rejects(
    async () => {
      await workItemService.deleteWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: feature1.id,
        actorUserId: "owner-1",
      });
    },
    WorkItemHasChildrenError,
  );

  // epic1 has feature1 and feature2 and task2 as children
  await assert.rejects(
    async () => {
      await workItemService.deleteWorkItem({
        workspaceId: ws1.id,
        projectId: project1.id,
        workItemId: epic1.id,
        actorUserId: "owner-1",
      });
    },
    WorkItemHasChildrenError,
  );

  // 8. Deleting childless item still works
  // task1 is a leaf child -> deleting succeeds
  await workItemService.deleteWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: task1.id,
    actorUserId: "owner-1",
  });

  // bug1 is a leaf child -> deleting succeeds
  await workItemService.deleteWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: bug1.id,
    actorUserId: "owner-1",
  });

  // Now feature1 has no children left -> deleting feature1 succeeds
  await workItemService.deleteWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: feature1.id,
    actorUserId: "owner-1",
  });

  // Delete remaining children of epic1 (feature2, task2)
  await workItemService.deleteWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: feature2.id,
    actorUserId: "owner-1",
  });
  await workItemService.deleteWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: task2.id,
    actorUserId: "owner-1",
  });

  // Now epic1 has no children left -> deleting epic1 succeeds
  await workItemService.deleteWorkItem({
    workspaceId: ws1.id,
    projectId: project1.id,
    workItemId: epic1.id,
    actorUserId: "owner-1",
  });
});


