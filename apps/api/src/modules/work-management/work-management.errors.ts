export class WorkItemTitleRequiredError extends Error {
  readonly code = "WORK_ITEM_TITLE_REQUIRED";

  constructor() {
    super("Work item title is required and cannot be blank.");
    this.name = "WorkItemTitleRequiredError";
  }
}

export class WorkItemTypeInvalidError extends Error {
  readonly code = "WORK_ITEM_TYPE_INVALID";

  constructor(type: string) {
    super(`Work item type '${type}' is invalid.`);
    this.name = "WorkItemTypeInvalidError";
  }
}

export class WorkItemHierarchyInvalidError extends Error {
  readonly code = "WORK_ITEM_HIERARCHY_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "WorkItemHierarchyInvalidError";
  }
}

export class WorkItemHierarchyCycleError extends Error {
  readonly code = "WORK_ITEM_HIERARCHY_CYCLE";

  constructor() {
    super("Hierarchy cycle detected. A work item cannot be its own ancestor.");
    this.name = "WorkItemHierarchyCycleError";
  }
}

export class WorkItemTenantMismatchError extends Error {
  readonly code = "WORK_ITEM_TENANT_MISMATCH";

  constructor(message = "Work item parent, project, or assignee must belong to the exact same workspace.") {
    super(message);
    this.name = "WorkItemTenantMismatchError";
  }
}

export class InvalidStateTransitionError extends Error {
  readonly code = "INVALID_STATE_TRANSITION";

  constructor(fromStateId: string, toStateId: string) {
    super(`Transition from state '${fromStateId}' to state '${toStateId}' is not allowed in this workflow.`);
    this.name = "InvalidStateTransitionError";
  }
}

export class WorkflowNotFoundError extends Error {
  readonly code = "WORKFLOW_NOT_FOUND";

  constructor() {
    super("Workflow not found.");
    this.name = "WorkflowNotFoundError";
  }
}

export class WorkflowStateNotFoundError extends Error {
  readonly code = "WORKFLOW_STATE_NOT_FOUND";

  constructor() {
    super("Workflow state not found.");
    this.name = "WorkflowStateNotFoundError";
  }
}

export class WorkflowMultipleInitialStatesError extends Error {
  readonly code = "WORKFLOW_MULTIPLE_INITIAL_STATES";

  constructor() {
    super("A workflow must have exactly one initial state.");
    this.name = "WorkflowMultipleInitialStatesError";
  }
}

export class WorkflowStateDuplicatePositionError extends Error {
  readonly code = "WORKFLOW_STATE_DUPLICATE_POSITION";

  constructor() {
    super("Workflow state position must be unique within a workflow.");
    this.name = "WorkflowStateDuplicatePositionError";
  }
}

export class DuplicateStateTransitionError extends Error {
  readonly code = "DUPLICATE_STATE_TRANSITION";

  constructor() {
    super("State transition between these two states already exists in this workflow.");
    this.name = "DuplicateStateTransitionError";
  }
}

export class WorkItemNotFoundError extends Error {
  readonly code = "WORK_ITEM_NOT_FOUND";

  constructor() {
    super("Work item not found.");
    this.name = "WorkItemNotFoundError";
  }
}

export class CommentNotFoundError extends Error {
  readonly code = "COMMENT_NOT_FOUND";

  constructor() {
    super("Comment not found.");
    this.name = "CommentNotFoundError";
  }
}
