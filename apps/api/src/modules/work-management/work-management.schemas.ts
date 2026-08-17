export const createWorkItemSchema = {
  tags: ["Work Management"],
  summary: "Create a work item",
  description: "Creates a new work item (Epic, Feature, Task, Bug) within a project.",
  params: {
    type: "object",
    required: ["workspaceId", "projectId"],
    properties: {
      workspaceId: { type: "string" },
      projectId: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["type", "title"],
    additionalProperties: false,
    properties: {
      type: { type: "string", enum: ["EPIC", "FEATURE", "TASK", "BUG"] },
      title: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string", nullable: true },
      parentId: { type: "string", nullable: true },
      workflowId: { type: "string", nullable: true },
      assigneeUserId: { type: "string", nullable: true },
      teamId: { type: "string", nullable: true },
      priority: {
        type: "string",
        enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      },
      storyPoints: { type: "integer", minimum: 0, nullable: true },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const listWorkItemsSchema = {
  tags: ["Work Management"],
  summary: "List work items",
  description: "Lists work items in a project with optional filters and pagination.",
  params: {
    type: "object",
    required: ["workspaceId", "projectId"],
    properties: {
      workspaceId: { type: "string" },
      projectId: { type: "string" },
    },
  },
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      type: { type: "string", enum: ["EPIC", "FEATURE", "TASK", "BUG"] },
      workflowStateId: { type: "string" },
      assigneeUserId: { type: "string" },
      teamId: { type: "string" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      parentId: { type: "string" },
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
      orderBy: { type: "string", enum: ["createdAt", "updatedAt"], default: "createdAt" },
      order: { type: "string", enum: ["asc", "desc"], default: "desc" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object", additionalProperties: true } },
        meta: {
          type: "object",
          properties: {
            page: { type: "integer" },
            limit: { type: "integer" },
            total: { type: "integer" },
          },
        },
      },
    },
  },
};

export const getWorkItemSchema = {
  tags: ["Work Management"],
  summary: "Get work item details",
  description: "Retrieves details of a specific work item within a workspace.",
  params: {
    type: "object",
    required: ["workspaceId", "workItemId"],
    properties: {
      workspaceId: { type: "string" },
      workItemId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const updateWorkItemSchema = {
  tags: ["Work Management"],
  summary: "Update work item details",
  description: "Updates editable attributes of a work item. Workflow state cannot be updated here.",
  params: {
    type: "object",
    required: ["workspaceId", "workItemId"],
    properties: {
      workspaceId: { type: "string" },
      workItemId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 1, maxLength: 255 },
      description: { type: "string", nullable: true },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      storyPoints: { type: "integer", minimum: 0, nullable: true },
      assigneeUserId: { type: "string", nullable: true },
      teamId: { type: "string", nullable: true },
      parentId: { type: "string", nullable: true },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const transitionWorkItemSchema = {
  tags: ["Work Management"],
  summary: "Transition work item workflow state",
  description: "Executes a workflow state transition for a work item.",
  params: {
    type: "object",
    required: ["workspaceId", "workItemId"],
    properties: {
      workspaceId: { type: "string" },
      workItemId: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["targetStateId"],
    additionalProperties: false,
    properties: {
      targetStateId: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const getChildrenSchema = {
  tags: ["Work Management"],
  summary: "Get children work items",
  description: "Retrieves direct child work items under a parent work item.",
  params: {
    type: "object",
    required: ["workspaceId", "workItemId"],
    properties: {
      workspaceId: { type: "string" },
      workItemId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object", additionalProperties: true } },
      },
    },
  },
};

export const getWorkItemHistorySchema = {
  tags: ["Work Management"],
  summary: "Get work item audit history",
  description: "Retrieves full audit trail of changes and state transitions for a work item.",
  params: {
    type: "object",
    required: ["workspaceId", "workItemId"],
    properties: {
      workspaceId: { type: "string" },
      workItemId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object", additionalProperties: true } },
      },
    },
  },
};

export const createWorkflowSchema = {
  tags: ["Workflows"],
  summary: "Create a workflow",
  description: "Creates a custom workflow in a workspace.",
  params: {
    type: "object",
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["name"],
    additionalProperties: false,
    properties: {
      name: { type: "string", minLength: 1, maxLength: 255 },
      projectId: { type: "string", nullable: true },
      isDefault: { type: "boolean" },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const listWorkflowsSchema = {
  tags: ["Workflows"],
  summary: "List workflows",
  description: "Lists all workflows in a workspace.",
  params: {
    type: "object",
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object", additionalProperties: true } },
      },
    },
  },
};

export const getWorkflowSchema = {
  tags: ["Workflows"],
  summary: "Get workflow detail",
  description: "Retrieves detailed workflow, states, and transitions.",
  params: {
    type: "object",
    required: ["workspaceId", "workflowId"],
    properties: {
      workspaceId: { type: "string" },
      workflowId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            workflow: { type: "object", additionalProperties: true },
            states: { type: "array", items: { type: "object", additionalProperties: true } },
            transitions: { type: "array", items: { type: "object", additionalProperties: true } },
          },
        },
      },
    },
  },
};

export const createCommentSchema = {
  tags: ["Work Item Comments"],
  summary: "Add a comment",
  description: "Adds a comment to a work item.",
  params: {
    type: "object",
    required: ["workspaceId", "workItemId"],
    properties: {
      workspaceId: { type: "string" },
      workItemId: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["content"],
    additionalProperties: false,
    properties: {
      content: { type: "string", minLength: 1 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const listCommentsSchema = {
  tags: ["Work Item Comments"],
  summary: "List comments",
  description: "Lists all comments on a work item.",
  params: {
    type: "object",
    required: ["workspaceId", "workItemId"],
    properties: {
      workspaceId: { type: "string" },
      workItemId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object", additionalProperties: true } },
      },
    },
  },
};

export const updateCommentSchema = {
  tags: ["Work Item Comments"],
  summary: "Update comment content",
  description: "Updates content of an existing comment.",
  params: {
    type: "object",
    required: ["workspaceId", "commentId"],
    properties: {
      workspaceId: { type: "string" },
      commentId: { type: "string" },
    },
  },
  body: {
    type: "object",
    required: ["content"],
    additionalProperties: false,
    properties: {
      content: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const deleteCommentSchema = {
  tags: ["Work Item Comments"],
  summary: "Delete comment",
  description: "Deletes a comment.",
  params: {
    type: "object",
    required: ["workspaceId", "commentId"],
    properties: {
      workspaceId: { type: "string" },
      commentId: { type: "string" },
    },
  },
};
