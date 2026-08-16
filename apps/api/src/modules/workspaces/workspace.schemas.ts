import { WORKSPACE_ROLES } from "./workspace.types.js";

const workspaceMemberSchema = {
  type: "object",
  additionalProperties: false,
  required: ["workspaceId", "userId", "role", "joinedAt"],
  properties: {
    workspaceId: { type: "string" },
    userId: { type: "string" },
    role: { type: "string", enum: [...WORKSPACE_ROLES] },
    joinedAt: { type: "string", format: "date-time" },
  },
} as const;

const workspaceProperties = {
  id: { type: "string", description: "Unique workspace identifier." },
  name: { type: "string", description: "Human-readable workspace name." },
  slug: { type: "string", description: "Unique URL slug for the workspace." },
  createdAt: { type: "string", format: "date-time" },
  updatedAt: { type: "string", format: "date-time" },
  membership: workspaceMemberSchema,
} as const;

const workspaceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "name", "slug", "createdAt", "updatedAt", "membership"],
  properties: workspaceProperties,
} as const;

const workspaceResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["data"],
  properties: {
    data: workspaceSchema,
  },
} as const;

const workspaceNotFoundSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error", "message"],
  properties: {
    error: { type: "string", const: "WORKSPACE_NOT_FOUND" },
    message: { type: "string", const: "Workspace not found." },
  },
} as const;

const workspaceSlugAlreadyExistsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error", "message"],
  properties: {
    error: { type: "string", const: "WORKSPACE_SLUG_ALREADY_EXISTS" },
    message: { type: "string", const: "Workspace slug is already in use." },
  },
} as const;

export const createWorkspaceSchema = {
  tags: ["Workspaces"],
  summary: "Create a workspace",
  description: "Creates a new multi-tenant workspace and assigns the creator as OWNER.",
  body: {
    type: "object",
    additionalProperties: false,
    required: ["name"],
    properties: {
      name: { type: "string", minLength: 1, maxLength: 100, examples: ["DevForge Org"] },
      slug: { type: "string", minLength: 1, maxLength: 100, examples: ["devforge-org"] },
    },
  },
  response: {
    201: workspaceResponseSchema,
    409: workspaceSlugAlreadyExistsSchema,
  },
} as const;

export const listWorkspacesSchema = {
  tags: ["Workspaces"],
  summary: "List user workspaces",
  description: "Returns all workspaces that the authenticated user is a member of.",
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: {
          type: "array",
          items: workspaceSchema,
        },
      },
    },
  },
} as const;

export const getWorkspaceSchema = {
  tags: ["Workspaces"],
  summary: "Get workspace details",
  description: "Returns workspace details if the user is a member of the workspace.",
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId"],
    properties: {
      workspaceId: { type: "string" },
    },
  },
  response: {
    200: workspaceResponseSchema,
    404: workspaceNotFoundSchema,
  },
} as const;

export const addWorkspaceMemberSchema = {
  tags: ["Workspaces"],
  summary: "Add a member to a workspace",
  description: "Adds a user to a workspace with a specified role (OWNER only).",
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
    required: ["userId", "role"],
    properties: {
      userId: { type: "string" },
      role: { type: "string", enum: [...WORKSPACE_ROLES] },
    },
  },
  response: {
    201: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: workspaceMemberSchema,
      },
    },
    404: workspaceNotFoundSchema,
  },
} as const;
