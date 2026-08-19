export const createRepositorySchema = {
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
    required: ["name", "externalId", "url"],
    properties: {
      name: { type: "string", minLength: 1 },
      provider: { type: "string", enum: ["GITHUB"] },
      externalId: { type: "string", minLength: 1 },
      url: { type: "string", minLength: 1 },
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
            name: { type: "string" },
            provider: { type: "string" },
            externalId: { type: "string" },
            url: { type: "string" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  },
};

export const ingestCommitSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "repoId"],
    properties: {
      workspaceId: { type: "string" },
      repoId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["externalId", "message", "authorName", "authorEmail", "committedAt", "url"],
    properties: {
      externalId: { type: "string", minLength: 1 },
      message: { type: "string", minLength: 1 },
      authorName: { type: "string", minLength: 1 },
      authorEmail: { type: "string", minLength: 1 },
      committedAt: { type: "string", minLength: 1 },
      url: { type: "string", minLength: 1 },
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
            repositoryId: { type: "string" },
            externalId: { type: "string" },
            message: { type: "string" },
            authorName: { type: "string" },
            authorEmail: { type: "string" },
            committedAt: { type: "string" },
            url: { type: "string" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  },
};

export const getCommitTraceSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "commitId"],
    properties: {
      workspaceId: { type: "string" },
      commitId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            commit: {
              type: "object",
              properties: {
                id: { type: "string" },
                workspaceId: { type: "string" },
                repositoryId: { type: "string" },
                externalId: { type: "string" },
                message: { type: "string" },
                authorName: { type: "string" },
                authorEmail: { type: "string" },
                committedAt: { type: "string" },
                url: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
              },
            },
            workItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  type: { type: "string" },
                  priority: { type: "string" },
                },
              },
            },
            adrs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  status: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const linkCommitToWorkItemSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "commitId"],
    properties: {
      workspaceId: { type: "string" },
      commitId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["workItemId"],
    properties: {
      workItemId: { type: "string", minLength: 1 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            commitId: { type: "string" },
            workItemId: { type: "string" },
            workspaceId: { type: "string" },
          },
        },
      },
    },
  },
};

export const linkCommitToAdrSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "commitId"],
    properties: {
      workspaceId: { type: "string" },
      commitId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["adrId"],
    properties: {
      adrId: { type: "string", minLength: 1 },
    },
  },
  response: {
    201: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            commitId: { type: "string" },
            adrId: { type: "string" },
            workspaceId: { type: "string" },
          },
        },
      },
    },
  },
};
