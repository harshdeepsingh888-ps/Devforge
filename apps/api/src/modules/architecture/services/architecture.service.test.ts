import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryArchitectureDecisionRepository } from "../repositories/memory/in-memory-architecture.repository.js";
import { InMemoryTechnicalSpecificationRepository } from "../repositories/memory/in-memory-spec.repository.js";
import { InMemoryArchitectureLinkRepository } from "../repositories/memory/in-memory-architecture-link.repository.js";
import { InMemoryWorkspaceRepository } from "../../workspaces/repositories/memory/in-memory-workspace.repository.js";
import { InMemoryProjectRepository } from "../../projects/project.repository.js";
import { InMemoryWorkItemRepository } from "../../work-management/repositories/memory/in-memory-work-item.repository.js";
import { ArchitectureService } from "./architecture.service.js";
import {
  ArchitectureDecisionImmutableError,
  ArchitecturePermissionDeniedError,
  ArchitectureProjectMismatchError,
  ArchitectureTenantMismatchError,
  DuplicateArchitectureLinkError,
  SpecNotFoundError,
  TechnicalSpecificationImmutableError,
} from "../architecture.errors.js";

async function setupArchitectureTestContext() {
  const adrRepo = new InMemoryArchitectureDecisionRepository();
  const specRepo = new InMemoryTechnicalSpecificationRepository();
  const linkRepo = new InMemoryArchitectureLinkRepository();
  const workspaceRepo = new InMemoryWorkspaceRepository();
  const projectRepo = new InMemoryProjectRepository();
  const workItemRepo = new InMemoryWorkItemRepository();

  const service = new ArchitectureService(
    adrRepo,
    specRepo,
    linkRepo,
    workspaceRepo,
    projectRepo,
    workItemRepo,
  );

  // Setup Workspace A
  const wsA = await workspaceRepo.create({ name: "Workspace A", slug: "ws-a" });
  await workspaceRepo.addMember({ workspaceId: wsA.id, userId: "user-owner-a", role: "OWNER" });
  await workspaceRepo.addMember({ workspaceId: wsA.id, userId: "user-admin-a", role: "ADMIN" });
  await workspaceRepo.addMember({ workspaceId: wsA.id, userId: "user-dev-a", role: "DEVELOPER" });
  await workspaceRepo.addMember({ workspaceId: wsA.id, userId: "user-viewer-a", role: "VIEWER" });

  const projA1 = await projectRepo.create({ workspaceId: wsA.id, name: "Project A1" });
  const projA2 = await projectRepo.create({ workspaceId: wsA.id, name: "Project A2" });

  // Setup Workspace B (Separate Tenant)
  const wsB = await workspaceRepo.create({ name: "Workspace B", slug: "ws-b" });
  await workspaceRepo.addMember({ workspaceId: wsB.id, userId: "user-owner-b", role: "OWNER" });
  const projB1 = await projectRepo.create({ workspaceId: wsB.id, name: "Project B1" });

  return {
    service,
    adrRepo,
    specRepo,
    linkRepo,
    workspaceRepo,
    projectRepo,
    workItemRepo,
    wsA,
    projA1,
    projA2,
    wsB,
    projB1,
  };
}

test("ADR Lifecycle & Immutability Rules", async () => {
  const ctx = await setupArchitectureTestContext();

  // 1. Propose ADR
  const adr = await ctx.service.createAdr({
    workspaceId: ctx.wsA.id,
    projectId: ctx.projA1.id,
    actorUserId: "user-dev-a",
    title: "Use Event Sourcing for Audit Logs",
    context: "Audit logs require append-only historical trace.",
    decision: "Adopt event sourcing for critical state transitions.",
    consequences: "Increased storage complexity but 100% audit accuracy.",
  });

  assert.ok(adr.id);
  assert.equal(adr.status, "PROPOSED");

  // 2. Edit ADR while PROPOSED
  const updated = await ctx.service.updateAdr(
    ctx.wsA.id,
    adr.id,
    "user-dev-a",
    { title: "Use Event Sourcing for DORA & Audit Logs" },
  );
  assert.equal(updated.title, "Use Event Sourcing for DORA & Audit Logs");

  // 3. Developer/Viewer CANNOT ACCEPT ADR
  await assert.rejects(
    async () => {
      await ctx.service.updateAdrStatus(
        ctx.wsA.id,
        adr.id,
        "user-dev-a",
        "ACCEPTED",
      );
    },
    ArchitecturePermissionDeniedError,
  );

  // 4. ADMIN accepts ADR
  const accepted = await ctx.service.updateAdrStatus(
    ctx.wsA.id,
    adr.id,
    "user-admin-a",
    "ACCEPTED",
  );
  assert.equal(accepted.status, "ACCEPTED");

  // 5. Immutability Rule: Cannot edit content of ACCEPTED ADR
  await assert.rejects(
    async () => {
      await ctx.service.updateAdr(
        ctx.wsA.id,
        adr.id,
        "user-admin-a",
        { title: "Attempted Modification" },
      );
    },
    ArchitectureDecisionImmutableError,
  );
});

test("Technical Specification Lifecycle & Immutability Rules", async () => {
  const ctx = await setupArchitectureTestContext();

  // 1. Create Spec in DRAFT
  const spec = await ctx.service.createSpec({
    workspaceId: ctx.wsA.id,
    projectId: ctx.projA1.id,
    actorUserId: "user-dev-a",
    title: "Work Management Architecture Spec",
    summary: "Detailed engineering spec for WorkItem hierarchy.",
    content: "# Work Management Spec\n- EPIC\n- FEATURE\n- TASK",
  });

  assert.ok(spec.id);
  assert.equal(spec.status, "DRAFT");

  // 2. Edit Spec while DRAFT
  const updated = await ctx.service.updateSpec(
    ctx.wsA.id,
    spec.id,
    "user-dev-a",
    { summary: "Updated summary for WorkItem spec." },
  );
  assert.equal(updated.summary, "Updated summary for WorkItem spec.");

  // 3. Developer CANNOT Approve Spec
  await assert.rejects(
    async () => {
      await ctx.service.updateSpecStatus(
        ctx.wsA.id,
        spec.id,
        "user-dev-a",
        "APPROVED",
      );
    },
    ArchitecturePermissionDeniedError,
  );

  // 4. OWNER approves Spec
  const approved = await ctx.service.updateSpecStatus(
    ctx.wsA.id,
    spec.id,
    "user-owner-a",
    "APPROVED",
  );
  assert.equal(approved.status, "APPROVED");

  // 5. Immutability Rule: Cannot edit content of APPROVED Spec
  await assert.rejects(
    async () => {
      await ctx.service.updateSpec(
        ctx.wsA.id,
        spec.id,
        "user-owner-a",
        { content: "New Content Attempt" },
      );
    },
    TechnicalSpecificationImmutableError,
  );
});

test("Architecture Linking Engine: ADR <-> Spec <-> WorkItem", async () => {
  const ctx = await setupArchitectureTestContext();

  // Setup ADR, Spec, and WorkItem in Workspace A / Project A1
  const adrGlobal = await ctx.service.createAdr({
    workspaceId: ctx.wsA.id,
    projectId: null,
    actorUserId: "user-dev-a",
    title: "Global Microservices Architecture ADR",
    context: "System-wide architectural standards.",
    decision: "Use REST APIs for internal communications.",
    consequences: "Standardized contract interfaces.",
  });

  const adrA1 = await ctx.service.createAdr({
    workspaceId: ctx.wsA.id,
    projectId: ctx.projA1.id,
    actorUserId: "user-dev-a",
    title: "Project A1 Database Schema ADR",
    context: "Database indexing rules.",
    decision: "Use PostgreSQL compound indexes.",
    consequences: "Faster multi-tenant lookups.",
  });

  const specA1 = await ctx.service.createSpec({
    workspaceId: ctx.wsA.id,
    projectId: ctx.projA1.id,
    actorUserId: "user-dev-a",
    title: "Project A1 REST Spec",
    summary: "API specification for Project A1.",
    content: "Endpoints definition.",
  });

  const workItemA1 = await ctx.workItemRepo.create({
    workspaceId: ctx.wsA.id,
    projectId: ctx.projA1.id,
    type: "EPIC",
    title: "Epic A1",
    workflowId: "wf-a1",
    workflowStateId: "ws-a1",
    reporterUserId: "user-dev-a",
  });

  // 1. Valid Links
  const link1 = await ctx.service.linkAdrToSpec(
    ctx.wsA.id,
    adrA1.id,
    specA1.id,
    "user-dev-a",
  );
  assert.ok(link1.id);

  const linkGlobal = await ctx.service.linkAdrToSpec(
    ctx.wsA.id,
    adrGlobal.id,
    specA1.id,
    "user-dev-a",
  );
  assert.ok(linkGlobal.id);

  const link2 = await ctx.service.linkSpecToWorkItem(
    ctx.wsA.id,
    specA1.id,
    workItemA1.id,
    "user-dev-a",
  );
  assert.ok(link2.id);

  const link3 = await ctx.service.linkAdrToWorkItem(
    ctx.wsA.id,
    adrA1.id,
    workItemA1.id,
    "user-dev-a",
  );
  assert.ok(link3.id);

  // 2. Reject Duplicate Links
  await assert.rejects(
    async () => {
      await ctx.service.linkAdrToSpec(
        ctx.wsA.id,
        adrA1.id,
        specA1.id,
        "user-dev-a",
      );
    },
    DuplicateArchitectureLinkError,
  );

  // 3. Reject Cross-Project Linking
  const specA2 = await ctx.service.createSpec({
    workspaceId: ctx.wsA.id,
    projectId: ctx.projA2.id,
    actorUserId: "user-dev-a",
    title: "Project A2 Spec",
    summary: "Project A2 technical spec.",
    content: "Project A2 content.",
  });

  await assert.rejects(
    async () => {
      await ctx.service.linkAdrToSpec(
        ctx.wsA.id,
        adrA1.id, // Scoped to projA1
        specA2.id, // Scoped to projA2
        "user-dev-a",
      );
    },
    ArchitectureProjectMismatchError,
  );

  // 4. Reject Cross-Workspace Tenant Linking
  const specB1 = await ctx.service.createSpec({
    workspaceId: ctx.wsB.id,
    projectId: ctx.projB1.id,
    actorUserId: "user-owner-b",
    title: "Workspace B Spec",
    summary: "Workspace B spec.",
    content: "Workspace B content.",
  });

  await assert.rejects(
    async () => {
      await ctx.service.linkAdrToSpec(
        ctx.wsA.id,
        adrA1.id,
        specB1.id,
        "user-dev-a",
      );
    },
    SpecNotFoundError,
  );
});
