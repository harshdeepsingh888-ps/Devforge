import assert from "node:assert/strict";
import test from "node:test";

import { buildApp } from "../../app.js";
import { JwtAccessTokenService } from "../auth/security/jwt.service.js";

async function setupApp() {
  const jwtService = new JwtAccessTokenService({
    secret: "devforge-e2e-test-jwt-signing-secret-key-32bytes",
    issuer: "devforge",
    audience: "devforge-api",
    expiresInSeconds: 900,
  });

  const app = buildApp({
    accessTokenService: jwtService,
  });

  const token = await jwtService.issue({
    userId: "user-e2e-arch-1",
    sessionId: "session-e2e-arch-1",
  });

  return { app, token };
}

test("Architecture E2E: Full Decision & Spec Lifecycle, Traceability Links & Immutability", async () => {
  const { app, token } = await setupApp();

  // 1. Create Workspace
  const wsRes = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: { authorization: `Bearer ${token}` },
    payload: { name: "Architecture Engine Workspace" },
  });
  assert.equal(wsRes.statusCode, 201);
  const workspaceId = wsRes.json().data.id;

  // 2. Create Project
  const projRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/projects`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name: "Core Platform Project" },
  });
  assert.equal(projRes.statusCode, 201);
  const projectId = projRes.json().data.id;

  // 3. Create Workflow & WorkItem
  const wfRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/workflows`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name: "Default Workflow", isDefault: true },
  });
  assert.equal(wfRes.statusCode, 201);

  const itemRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/projects/${projectId}/work-items`,
    headers: { authorization: `Bearer ${token}` },
    payload: { type: "TASK", title: "Implement Architecture Engine" },
  });
  assert.equal(itemRes.statusCode, 201);
  const workItem = itemRes.json().data;

  // 4. Create ADR
  const adrRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/adrs`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      projectId,
      title: "ADR 001: Event-Driven Architecture",
      context: "Context of EDA",
      decision: "Adopt Kafka/RabbitMQ",
      consequences: "Eventual consistency",
    },
  });
  assert.equal(adrRes.statusCode, 201);
  const adr = adrRes.json().data;
  assert.equal(adr.status, "PROPOSED");

  // 5. Create Spec
  const specRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/specs`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      projectId,
      title: "Spec 001: Message Schema",
      summary: "High level event payload format",
      content: "# Event Payload Schema Definition",
    },
  });
  assert.equal(specRes.statusCode, 201);
  const spec = specRes.json().data;
  assert.equal(spec.status, "DRAFT");

  // 6. Link ADR ↔ Spec
  const adrSpecLinkRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/architecture/links/adr-spec`,
    headers: { authorization: `Bearer ${token}` },
    payload: { adrId: adr.id, specId: spec.id },
  });
  assert.equal(adrSpecLinkRes.statusCode, 201);

  // 7. Link Spec ↔ WorkItem
  const specItemLinkRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/architecture/links/spec-work-item`,
    headers: { authorization: `Bearer ${token}` },
    payload: { specId: spec.id, workItemId: workItem.id },
  });
  assert.equal(specItemLinkRes.statusCode, 201);

  // 8. Link ADR ↔ WorkItem
  const adrItemLinkRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/architecture/links/adr-work-item`,
    headers: { authorization: `Bearer ${token}` },
    payload: { adrId: adr.id, workItemId: workItem.id },
  });
  assert.equal(adrItemLinkRes.statusCode, 201);

  // 9. Approve Spec
  const approveSpecRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/specs/${spec.id}/approve`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(approveSpecRes.statusCode, 200);
  assert.equal(approveSpecRes.json().data.status, "APPROVED");

  // 10. Accept ADR
  const acceptAdrRes = await app.inject({
    method: "POST",
    url: `/api/workspaces/${workspaceId}/adrs/${adr.id}/accept`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(acceptAdrRes.statusCode, 200);
  assert.equal(acceptAdrRes.json().data.status, "ACCEPTED");

  // 11. Immutability Verification: Attempt editing ACCEPTED ADR (Must Fail with 409 Conflict)
  const editAdrRes = await app.inject({
    method: "PATCH",
    url: `/api/workspaces/${workspaceId}/adrs/${adr.id}`,
    headers: { authorization: `Bearer ${token}` },
    payload: { title: "Attempted Modification" },
  });
  assert.equal(editAdrRes.statusCode, 409);

  // 12. Immutability Verification: Attempt editing APPROVED Spec (Must Fail with 409 Conflict)
  const editSpecRes = await app.inject({
    method: "PATCH",
    url: `/api/workspaces/${workspaceId}/specs/${spec.id}`,
    headers: { authorization: `Bearer ${token}` },
    payload: { title: "Attempted Modification" },
  });
  assert.equal(editSpecRes.statusCode, 409);

  // 13. Tenant Isolation / IDOR Protection (Must Return 404 Not Found)
  const idorAdrRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/other-workspace-999/adrs/${adr.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(idorAdrRes.statusCode, 404);

  const idorSpecRes = await app.inject({
    method: "GET",
    url: `/api/workspaces/other-workspace-999/specs/${spec.id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(idorSpecRes.statusCode, 404);

  await app.close();
});
