import { PROJECT_STATUSES } from "./project.types.js";

const projectProperties = {
  id: {
    type: "string",
    description: "Unique project identifier.",
  },
  name: {
    type: "string",
    description: "Human-readable project name.",
  },
  description: {
    anyOf: [
      {
        type: "string",
      },
      {
        type: "null",
      },
    ],
    description: "Optional project description.",
  },
  status: {
    type: "string",
    enum: [...PROJECT_STATUSES],
    description: "Current project lifecycle status.",
  },
  createdAt: {
    type: "string",
    format: "date-time",
    description: "Time at which the project was created.",
  },
  updatedAt: {
    type: "string",
    format: "date-time",
    description: "Time at which the project was last modified.",
  },
} as const;

const projectSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "name",
    "description",
    "status",
    "createdAt",
    "updatedAt",
  ],
  properties: projectProperties,
} as const;

const projectResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: projectSchema,
  },
} as const;

const projectNotFoundSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error", "message"],
  properties: {
    error: {
      type: "string",
      const: "PROJECT_NOT_FOUND",
    },
    message: {
      type: "string",
      const: "Project not found.",
    },
  },
} as const;

export const listProjectsSchema = {
  tags: ["Projects"],
  summary: "List projects",
  description:
    "Returns all projects currently stored in the DevForge workspace.",
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: {
          type: "array",
          items: projectSchema,
        },
      },
    },
  },
} as const;

export const getProjectSchema = {
  tags: ["Projects"],
  summary: "Get a project",
  description:
    "Returns one DevForge project identified by its project ID.",
  params: {
    type: "object",
    additionalProperties: false,
    required: ["projectId"],
    properties: {
      projectId: {
        type: "string",
      },
    },
  },
  response: {
    200: projectResponseSchema,
    404: projectNotFoundSchema,
  },
} as const;

export const createProjectSchema = {
  tags: ["Projects"],
  summary: "Create a project",
  description:
    "Creates a new DevForge project with an initial ACTIVE status.",
  body: {
    type: "object",
    additionalProperties: false,
    required: ["name"],
    properties: {
      name: {
        type: "string",
        minLength: 1,
        maxLength: 100,
        examples: ["DevForge"],
      },
      description: {
        type: "string",
        maxLength: 500,
        examples: [
          "A developer operating system for preserving engineering context.",
        ],
      },
    },
  },
  response: {
    201: projectResponseSchema,
  },
} as const;

export const updateProjectStatusSchema = {
  tags: ["Projects"],
  summary: "Update project status",
  description:
    "Changes the lifecycle status of an existing DevForge project.",
  params: {
    type: "object",
    additionalProperties: false,
    required: ["projectId"],
    properties: {
      projectId: {
        type: "string",
      },
    },
  },
  body: {
    type: "object",
    additionalProperties: false,
    required: ["status"],
    properties: {
      status: {
        type: "string",
        enum: [...PROJECT_STATUSES],
        examples: ["PAUSED"],
      },
    },
  },
  response: {
    200: projectResponseSchema,
    404: projectNotFoundSchema,
  },
} as const;