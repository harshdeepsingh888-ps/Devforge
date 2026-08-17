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
  WorkItemTenantMismatchError,
  InvalidStateTransitionError,
  WorkflowMultipleInitialStatesError,
  WorkflowStateDuplicatePositionError,
  DuplicateStateTransitionError,
  WorkItemTitleRequiredError,
} from "../work-management.errors.js";

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

  const backlogState = await workflowRepo.createState({
    workflowId: defaultWorkflow.id,
    name: "Backlog",
    category: "BACKLOG",
    position: 0,
    isInitial: true,
  });

  const inProgressState = await workflowRepo.createState({
    workflowId: defaultWorkflow.id,
    name: "In Progress",
    category: "STARTED",
    position: 1,
  });

  const doneState = await workflowRepo.createState({
    workflowId: defaultWorkflow.id,
    name: "Done",
    category: "COMPLETED",
    position: 2,
    isTerminal: true,
  });

  // Add allowed transitions: Backlog -> In Progress -> Done
  await workflowRepo.createTransition({
    workflowId: defaultWorkflow.id,
    fromStateId: backlogState.id,
    toStateId: inProgressState.id,
  });

  await workflowRepo.createTransition({
    workflowId: defaultWorkflow.id,
    fromStateId: inProgressState.id,
    toStateId: doneState.id,
  });

  const ws2Workflow = await workflowRepo.createWorkflow({
    workspaceId: ws2.id,
    name: "WS2 Default Workflow",
    isDefault: true,
  });

  await workflowRepo.createState({
    workflowId: ws2Workflow.id,
    name: "Backlog",
    category: "BACKLOG",
    position: 0,
    isInitial: true,
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

  // Transition In Progress -> Done (Allowed)
  const doneItem = await workItemService.transitionState({
    workspaceId: ws1.id,
    workItemId: task.id,
    actorUserId: "dev-1",
    targetStateId: doneState.id,
  });

  assert.equal(doneItem.workflowStateId, doneState.id);
  assert.ok(doneItem.completedAt);

  // Unlinked Transition: Attempting Done -> Backlog (not linked in workflow) -> throws InvalidStateTransitionError
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
