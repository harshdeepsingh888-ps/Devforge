export const createAdrSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["title", "context", "decision", "consequences"],
    properties: {
      projectId: { type: "string", nullable: true },
      title: { type: "string", minLength: 1 },
      context: { type: "string", minLength: 1 },
      decision: { type: "string", minLength: 1 },
      consequences: { type: "string", minLength: 1 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            id: { type: "string" },
            workspaceId: { type: "string" },
            projectId: { type: "string", nullable: true },
            title: { type: "string" },
            status: { type: "string" },
            context: { type: "string" },
            decision: { type: "string" },
            consequences: { type: "string" },
            createdByUserId: { type: "string" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  },
};

export const updateAdrSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "adrId"],
    properties: {
      workspaceId: { type: "string" },
      adrId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 1 },
      context: { type: "string", minLength: 1 },
      decision: { type: "string", minLength: 1 },
      consequences: { type: "string", minLength: 1 },
    },
  },
};

export const createSpecSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["projectId", "title", "summary", "content"],
    properties: {
      projectId: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1 },
      summary: { type: "string", minLength: 1 },
      content: { type: "string", minLength: 1 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            id: { type: "string" },
            workspaceId: { type: "string" },
            projectId: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            content: { type: "string" },
            status: { type: "string" },
            createdByUserId: { type: "string" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  },
};

export const updateSpecSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "specId"],
    properties: {
      workspaceId: { type: "string" },
      specId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 1 },
      summary: { type: "string", minLength: 1 },
      content: { type: "string", minLength: 1 },
    },
  },
};

export const linkAdrSpecSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["adrId", "specId"],
    properties: {
      adrId: { type: "string", minLength: 1 },
      specId: { type: "string", minLength: 1 },
    },
  },
};

export const linkSpecWorkItemSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["specId", "workItemId"],
    properties: {
      specId: { type: "string", minLength: 1 },
      workItemId: { type: "string", minLength: 1 },
    },
  },
};

export const linkAdrWorkItemSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["adrId", "workItemId"],
    properties: {
      adrId: { type: "string", minLength: 1 },
      workItemId: { type: "string", minLength: 1 },
    },
  },
};
