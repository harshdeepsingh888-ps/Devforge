export const createPipelineSchema = {
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
    required: ["projectId", "name", "externalId"],
    properties: {
      projectId: { type: "string", minLength: 1 },
      provider: {
        type: "string",
        enum: ["GITHUB_ACTIONS", "GITLAB", "JENKINS"],
      },
      name: { type: "string", minLength: 1 },
      externalId: { type: "string", minLength: 1 },
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
            provider: { type: "string" },
            name: { type: "string" },
            externalId: { type: "string" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  },
};

export const ingestPipelineRunSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "pipelineId"],
    properties: {
      workspaceId: { type: "string" },
      pipelineId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["commitId", "externalRunId"],
    properties: {
      commitId: { type: "string", minLength: 1 },
      status: {
        type: "string",
        enum: ["PENDING", "RUNNING", "SUCCESS", "FAILED", "CANCELED"],
      },
      startedAt: { type: "string" },
      finishedAt: { type: "string", nullable: true },
      durationMs: { type: "number", nullable: true },
      triggeredByUserId: { type: "string", nullable: true },
      externalRunId: { type: "string", minLength: 1 },
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
            pipelineId: { type: "string" },
            commitId: { type: "string" },
            status: { type: "string" },
            startedAt: { type: "string" },
            finishedAt: { type: "string", nullable: true },
            durationMs: { type: "number", nullable: true },
            triggeredByUserId: { type: "string", nullable: true },
            externalRunId: { type: "string" },
            createdAt: { type: "string" },
            updatedAt: { type: "string" },
          },
        },
      },
    },
  },
};

export const recordDeploymentSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "runId"],
    properties: {
      workspaceId: { type: "string" },
      runId: { type: "string" },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["environment"],
    properties: {
      environment: { type: "string", enum: ["DEV", "STAGING", "PROD"] },
      status: { type: "string", enum: ["DEPLOYED", "FAILED", "ROLLED_BACK"] },
      deployedAt: { type: "string" },
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
            pipelineRunId: { type: "string" },
            environment: { type: "string" },
            status: { type: "string" },
            deployedAt: { type: "string" },
            createdAt: { type: "string" },
          },
        },
      },
    },
  },
};
