import { INVITATION_STATUSES, WORKSPACE_ROLES } from "./workspace.types.js";

const workspaceIdParams = {
  type: "object",
  additionalProperties: false,
  required: ["workspaceId"],
  properties: {
    workspaceId: { type: "string" },
  },
} as const;

const errorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error", "message"],
  properties: {
    error: { type: "string" },
    message: { type: "string" },
  },
} as const;

/** The API-facing invitation. Never includes tokenHash. */
const safeInvitationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "workspaceId",
    "email",
    "role",
    "status",
    "expiresAt",
    "invitedByUserId",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string" },
    workspaceId: { type: "string" },
    email: { type: "string" },
    role: { type: "string", enum: [...WORKSPACE_ROLES] },
    status: { type: "string", enum: [...INVITATION_STATUSES] },
    expiresAt: { type: "string" },
    invitedByUserId: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
} as const;

const membershipSchema = {
  type: "object",
  additionalProperties: false,
  required: ["workspaceId", "userId", "role", "joinedAt"],
  properties: {
    workspaceId: { type: "string" },
    userId: { type: "string" },
    role: { type: "string", enum: [...WORKSPACE_ROLES] },
    joinedAt: { type: "string" },
  },
} as const;

/*
 * The raw token is accepted only in request bodies, never in the URL:
 * request URLs are logged on every response and tokens must stay out of logs.
 */
const tokenBody = {
  type: "object",
  additionalProperties: false,
  required: ["token"],
  properties: {
    token: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
} as const;

export const createInvitationSchema = {
  tags: ["Invitations"],
  summary: "Invite someone to a workspace",
  description:
    "Creates a pending invitation (OWNER or ADMIN; only an OWNER may invite an OWNER). The raw token is returned once, in this response only, for the inviter to share. It is stored hashed and can never be retrieved again.",
  params: workspaceIdParams,
  body: {
    type: "object",
    additionalProperties: false,
    required: ["email", "role"],
    properties: {
      email: { type: "string", format: "email", maxLength: 254 },
      role: { type: "string", enum: [...WORKSPACE_ROLES] },
      expiresInDays: { type: "integer", minimum: 1, maximum: 30 },
    },
  },
  response: {
    201: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: {
          type: "object",
          additionalProperties: false,
          required: ["invitation", "token"],
          properties: {
            invitation: safeInvitationSchema,
            token: { type: "string" },
          },
        },
      },
    },
    403: errorSchema,
    404: errorSchema,
    409: errorSchema,
  },
} as const;

export const listInvitationsSchema = {
  tags: ["Invitations"],
  summary: "List a workspace's invitations",
  description: "Returns every invitation of the workspace in any status (OWNER or ADMIN).",
  params: workspaceIdParams,
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: { type: "array", items: safeInvitationSchema },
      },
    },
    403: errorSchema,
    404: errorSchema,
  },
} as const;

export const revokeInvitationSchema = {
  tags: ["Invitations"],
  summary: "Revoke a pending invitation",
  description: "Marks a pending invitation REVOKED so its token can no longer be redeemed (OWNER or ADMIN).",
  params: {
    type: "object",
    additionalProperties: false,
    required: ["workspaceId", "invitationId"],
    properties: {
      workspaceId: { type: "string" },
      invitationId: { type: "string" },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: safeInvitationSchema,
      },
    },
    403: errorSchema,
    404: errorSchema,
    409: errorSchema,
  },
} as const;

export const lookupInvitationSchema = {
  tags: ["Invitations"],
  summary: "Preview an invitation by token",
  description:
    "Returns the pending invitation behind a token and the workspace it opens, so the invitee can see what they are accepting. Requires authentication.",
  body: tokenBody,
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: {
          type: "object",
          additionalProperties: false,
          required: [...safeInvitationSchema.required, "workspace"],
          properties: {
            ...safeInvitationSchema.properties,
            workspace: {
              type: "object",
              additionalProperties: false,
              required: ["id", "name", "slug"],
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                slug: { type: "string" },
              },
            },
          },
        },
      },
    },
    404: errorSchema,
    409: errorSchema,
    410: errorSchema,
  },
} as const;

export const acceptInvitationSchema = {
  tags: ["Invitations"],
  summary: "Accept an invitation",
  description:
    "Redeems a pending invitation for the authenticated user, whose account email must match the invitation. Creates the workspace membership and returns the workspace.",
  body: tokenBody,
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      required: ["data"],
      properties: {
        data: {
          type: "object",
          additionalProperties: false,
          required: ["workspace", "membership"],
          properties: {
            workspace: {
              type: "object",
              additionalProperties: false,
              required: ["id", "name", "slug", "createdAt", "updatedAt"],
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                slug: { type: "string" },
                createdAt: { type: "string" },
                updatedAt: { type: "string" },
              },
            },
            membership: membershipSchema,
          },
        },
      },
    },
    403: errorSchema,
    404: errorSchema,
    409: errorSchema,
    410: errorSchema,
  },
} as const;
