import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../app.js";
import { JwtAccessTokenService } from "../modules/auth/security/jwt.service.js";

const DEFAULT_JWT_SECRET =
  "devforge-default-development-jwt-signing-secret-key-32bytes";

test("V2 Work Management REST API End-to-End Lifecycle & Security Verification", async () => {
  const jwtService = new JwtAccessTokenService({
    secret: DEFAULT_JWT_SECRET,
    issuer: "devforge",
    audience: "devforge-api",
    expiresInSeconds: 900,
  });

  const app = buildApp({
    accessTokenService: jwtService,
  });

  // Issue Access Tokens for test actors
  const ownerToken = await jwtService.issue({
    userId: "user-owner-1",
    sessionId: "session-1",
  });

  const devToken = await jwtService.issue({
    userId: "user-dev-1",
    sessionId: "session-2",
  });

  const viewerToken = await jwtService.issue({
    userId: "user-viewer-1",
    sessionId: "session-3",
  });

  const outsiderToken = await jwtService.issue({
    userId: "user-outsider-1",
    sessionId: "session-4",
  });

  // 1. Create Workspace
  const createWsRes = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { name: "DevForge Engineering", slug: "devforge-eng-v2" },
  });

  assert.equal(createWsRes.statusCode, 201);
  const ws1 = createWsRes.json().data;
  assert.equal(ws1.name, "DevForge Engineering");

  // 1b. Create Workspace 2 (for Cross-Tenant Security Testing)
  const createWs2Res = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: { authorization: `Bearer ${outsiderToken}` },
    payload: { name: "Outsider Workspace", slug: "outsider-corp" },
  });
  const ws2 = createWs2Res.json().data;

  // 2. Add Developer & Viewer members to Workspace 1
  await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/members`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { userId: "user-dev-1", role: "DEVELOPER" },
  });

  await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/members`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { userId: "user-viewer-1", role: "VIEWER" },
  });

  // 3. Create Project in Workspace 1
  const createProjectRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/projects`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { name: "Core Platform Engine", description: "V2 Backend Architecture" },
  });

  assert.equal(createProjectRes.statusCode, 201);
  const project1 = createProjectRes.json().data;

  // 4. Create Custom Workflow & States (ADMIN+)
  const createWorkflowRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/workflows`,
    headers: { authorization: `Bearer ${ownerToken}` },
    payload: { name: "Scrum Agile Workflow", isDefault: true },
  });

  assert.equal(createWorkflowRes.statusCode, 201);
  const workflow1 = createWorkflowRes.json().data;

  // Seed default workflow state via service or route for tests
  // Note: workflow creation auto-assigns initial state or default workflow state in service.

  // 5. Create EPIC WorkItem (DEVELOPER+)
  const createEpicRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/projects/${project1.id}/work-items`,
    headers: { authorization: `Bearer ${devToken}` },
    payload: {
      type: "EPIC",
      title: "Epic 1: Developer OS Work Management Engine",
      description: "Complete V2 work management implementation",
      priority: "HIGH",
    },
  });

  assert.equal(createEpicRes.statusCode, 201);
  const epic = createEpicRes.json().data;
  assert.equal(epic.type, "EPIC");
  assert.equal(epic.parentId, null);

  // 6. Create FEATURE under EPIC
  const createFeatureRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/projects/${project1.id}/work-items`,
    headers: { authorization: `Bearer ${devToken}` },
    payload: {
      type: "FEATURE",
      title: "Feature 1.1: State Transitions & Audit Trails",
      parentId: epic.id,
      priority: "HIGH",
    },
  });

  assert.equal(createFeatureRes.statusCode, 201);
  const feature = createFeatureRes.json().data;
  assert.equal(feature.parentId, epic.id);

  // 7. Create TASK under FEATURE
  const createTaskRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/projects/${project1.id}/work-items`,
    headers: { authorization: `Bearer ${devToken}` },
    payload: {
      type: "TASK",
      title: "Task 1.1.1: REST Controller Endpoints",
      parentId: feature.id,
      assigneeUserId: "user-dev-1",
      storyPoints: 5,
    },
  });

  assert.equal(createTaskRes.statusCode, 201);
  const task = createTaskRes.json().data;
  assert.equal(task.parentId, feature.id);

  // 8. Create BUG under EPIC
  const createBugRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/projects/${project1.id}/work-items`,
    headers: { authorization: `Bearer ${devToken}` },
    payload: {
      type: "BUG",
      title: "Bug 1.2: Payload Validation Null Check Failure",
      parentId: epic.id,
      priority: "URGENT",
    },
  });

  assert.equal(createBugRes.statusCode, 201);
  const bug = createBugRes.json().data;

  // 9. Update WorkItem Details (PATCH)
  const updateTaskRes = await app.inject({
    method: "PATCH",
    url: `/api/workspaces/${ws1.id}/work-items/${task.id}`,
    headers: { authorization: `Bearer ${devToken}` },
    payload: {
      description: "Added comprehensive REST schemas and Fastify route validation.",
      storyPoints: 8,
    },
  });

  assert.equal(updateTaskRes.statusCode, 200);
  assert.equal(updateTaskRes.json().data.storyPoints, 8);

  // 10. Add Comment (DEVELOPER+)
  const addCommentRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/work-items/${task.id}/comments`,
    headers: { authorization: `Bearer ${devToken}` },
    payload: {
      content: "PR implementation complete. Ready for integration review.",
    },
  });

  assert.equal(addCommentRes.statusCode, 201);
  const comment = addCommentRes.json().data;
  assert.equal(comment.content, "PR implementation complete. Ready for integration review.");

  // 11. Read History (VIEWER+)
  const historyRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws1.id}/work-items/${task.id}/history`,
    headers: { authorization: `Bearer ${viewerToken}` },
  });

  assert.equal(historyRes.statusCode, 200);
  const history = historyRes.json().data;
  assert.ok(history.length >= 2); // CREATED + COMMENTED

  // 12. Query List with Filters & Pagination (VIEWER+)
  const listItemsRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws1.id}/projects/${project1.id}/work-items?type=TASK&priority=MEDIUM`,
    headers: { authorization: `Bearer ${viewerToken}` },
  });

  assert.equal(listItemsRes.statusCode, 200);
  const listBody = listItemsRes.json();
  assert.equal(listBody.data.length, 1);
  assert.equal(listBody.data[0].id, task.id);
  assert.equal(listBody.meta.total, 1);

  // 13. Security Verification: VIEWER role cannot create work items
  const viewerCreateRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${ws1.id}/projects/${project1.id}/work-items`,
    headers: { authorization: `Bearer ${viewerToken}` },
    payload: {
      type: "TASK",
      title: "Unauthorized Task Creation",
    },
  });

  assert.equal(viewerCreateRes.statusCode, 403);
  assert.equal(viewerCreateRes.json().error, "FORBIDDEN");

  // 14. Security Verification: Anti-Enumeration & IDOR Protection
  // Outsider User (in Workspace 2) attempts to fetch WorkItem from Workspace 1
  const idorRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws2.id}/work-items/${task.id}`,
    headers: { authorization: `Bearer ${outsiderToken}` },
  });

  assert.equal(idorRes.statusCode, 404);
  assert.equal(idorRes.json().error, "WORK_ITEM_NOT_FOUND");

  // Cross-tenant attempt: Member of WS1 trying to access WS1 work item through WS2 path
  const crossTenantPathRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/${ws2.id}/work-items/${task.id}`,
    headers: { authorization: `Bearer ${devToken}` },
  });

  assert.equal(crossTenantPathRes.statusCode, 404);
});
