import assert from "node:assert/strict";
import test from "node:test";

import { InMemoryArchitectureDecisionRepository } from "../../architecture/repositories/memory/in-memory-architecture.repository.js";
import { InMemoryWorkItemRepository } from "../../work-management/repositories/memory/in-memory-work-item.repository.js";
import {
  CommitNotFoundError,
  DuplicateCommitError,
  DuplicateCommitLinkError,
  GitTenantMismatchError,
  RepositoryNotFoundError,
} from "../git.errors.js";
import { InMemoryCommitRepository } from "../repositories/memory/in-memory-commit.repository.js";
import { InMemoryGitLinkRepository } from "../repositories/memory/in-memory-git-link.repository.js";
import { InMemoryRepositoryRepository } from "../repositories/memory/in-memory-repository.repository.js";
import { GitService } from "./git.service.js";

function setupService() {
  const repoRepository = new InMemoryRepositoryRepository();
  const commitRepository = new InMemoryCommitRepository();
  const gitLinkRepository = new InMemoryGitLinkRepository();
  const workItemRepository = new InMemoryWorkItemRepository();
  const adrRepository = new InMemoryArchitectureDecisionRepository();

  const service = new GitService(
    repoRepository,
    commitRepository,
    gitLinkRepository,
    workItemRepository,
    adrRepository,
  );

  return {
    service,
    repoRepository,
    commitRepository,
    gitLinkRepository,
    workItemRepository,
    adrRepository,
  };
}

test("GitService: Repository Creation & Retrieval", async () => {
  const { service } = setupService();

  const repo = await service.createRepository({
    workspaceId: "ws-1",
    name: "devforge-api",
    provider: "GITHUB",
    externalId: "12345",
    url: "https://github.com/org/devforge-api",
  });

  assert.equal(repo.name, "devforge-api");
  assert.equal(repo.workspaceId, "ws-1");

  const found = await service.findRepositoryById("ws-1", repo.id);
  assert.notEqual(found, null);
  assert.equal(found?.id, repo.id);
});

test("GitService: Commit Ingestion & Duplicate Prevention", async () => {
  const { service } = setupService();

  const repo = await service.createRepository({
    workspaceId: "ws-1",
    name: "devforge-api",
    externalId: "12345",
    url: "https://github.com/org/devforge-api",
  });

  const commit = await service.ingestCommit({
    workspaceId: "ws-1",
    repositoryId: repo.id,
    externalId: "a1b2c3d4e5",
    message: "feat: initial commit",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    committedAt: new Date().toISOString(),
    url: "https://github.com/org/devforge-api/commit/a1b2c3d4e5",
  });

  assert.equal(commit.externalId, "a1b2c3d4e5");

  // Ingesting duplicate commit SHA must throw DuplicateCommitError
  await assert.rejects(
    async () => {
      await service.ingestCommit({
        workspaceId: "ws-1",
        repositoryId: repo.id,
        externalId: "a1b2c3d4e5",
        message: "duplicate commit attempt",
        authorName: "Alice",
        authorEmail: "alice@example.com",
        committedAt: new Date().toISOString(),
        url: "https://github.com/org/devforge-api/commit/a1b2c3d4e5",
      });
    },
    (err: unknown) => err instanceof DuplicateCommitError,
  );
});

test("GitService: Ingesting for non-existent repository throws RepositoryNotFoundError", async () => {
  const { service } = setupService();

  await assert.rejects(
    async () => {
      await service.ingestCommit({
        workspaceId: "ws-1",
        repositoryId: "non-existent-repo",
        externalId: "sha-1",
        message: "test",
        authorName: "Bob",
        authorEmail: "bob@example.com",
        committedAt: new Date().toISOString(),
        url: "https://example.com",
      });
    },
    (err: unknown) => err instanceof RepositoryNotFoundError,
  );
});

test("GitService: Manual Linking & Duplicate Link Prevention", async () => {
  const { service, workItemRepository, adrRepository } = setupService();

  const repo = await service.createRepository({
    workspaceId: "ws-1",
    name: "devforge-api",
    externalId: "12345",
    url: "https://github.com/org/devforge-api",
  });

  const commit = await service.ingestCommit({
    workspaceId: "ws-1",
    repositoryId: repo.id,
    externalId: "sha-100",
    message: "refactor domain logic",
    authorName: "Charlie",
    authorEmail: "charlie@example.com",
    committedAt: new Date().toISOString(),
    url: "https://example.com/commit/sha-100",
  });

  const workItem = await workItemRepository.create({
    workspaceId: "ws-1",
    projectId: "proj-1",
    workflowId: "wf-1",
    workflowStateId: "state-1",
    type: "TASK",
    title: "Implement Domain Model",
    reporterUserId: "user-1",
  });

  const adr = await adrRepository.create({
    workspaceId: "ws-1",
    projectId: "proj-1",
    actorUserId: "user-1",
    title: "Use Clean Architecture",
    context: "Context",
    decision: "Decision",
    consequences: "Consequences",
  });

  const itemLink = await service.linkCommitToWorkItem(
    commit.id,
    workItem.id,
    "ws-1",
  );
  assert.equal(itemLink.commitId, commit.id);
  assert.equal(itemLink.workItemId, workItem.id);

  // Duplicate link attempt must throw DuplicateCommitLinkError
  await assert.rejects(
    async () => {
      await service.linkCommitToWorkItem(commit.id, workItem.id, "ws-1");
    },
    (err: unknown) => err instanceof DuplicateCommitLinkError,
  );

  const adrLink = await service.linkCommitToAdr(commit.id, adr.id, "ws-1");
  assert.equal(adrLink.commitId, commit.id);
  assert.equal(adrLink.adrId, adr.id);

  const trace = await service.getCommitTrace(commit.id, "ws-1");
  assert.equal(trace.commit.id, commit.id);
  assert.equal(trace.workItems.length, 1);
  assert.equal(trace.workItems[0]?.id, workItem.id);
  assert.equal(trace.adrs.length, 1);
  assert.equal(trace.adrs[0]?.id, adr.id);
});

test("GitService: Auto-linking from Commit Message References", async () => {
  const { service, workItemRepository, adrRepository } = setupService();

  const repo = await service.createRepository({
    workspaceId: "ws-1",
    name: "devforge-api",
    externalId: "12345",
    url: "https://github.com/org/devforge-api",
  });

  const workItem = await workItemRepository.create({
    workspaceId: "ws-1",
    projectId: "proj-1",
    workflowId: "wf-1",
    workflowStateId: "state-1",
    type: "TASK",
    title: "Fix Auth Bug",
    reporterUserId: "user-1",
  });

  const adr = await adrRepository.create({
    workspaceId: "ws-1",
    projectId: "proj-1",
    actorUserId: "user-1",
    title: "JWT Authentication Strategy",
    context: "Context",
    decision: "Decision",
    consequences: "Consequences",
  });

  const commit = await service.ingestCommit({
    workspaceId: "ws-1",
    repositoryId: repo.id,
    externalId: "sha-200",
    message: `fix(auth): resolve login session issue ${workItem.id} according to ${adr.id}`,
    authorName: "Dev",
    authorEmail: "dev@example.com",
    committedAt: new Date().toISOString(),
    url: "https://example.com/commit/sha-200",
  });

  const trace = await service.getCommitTrace(commit.id, "ws-1");
  assert.equal(trace.workItems.length, 1);
  assert.equal(trace.workItems[0]?.id, workItem.id);
  assert.equal(trace.adrs.length, 1);
  assert.equal(trace.adrs[0]?.id, adr.id);
});

test("GitService: Tenant Isolation Enforcement", async () => {
  const { service, workItemRepository } = setupService();

  const repo1 = await service.createRepository({
    workspaceId: "ws-1",
    name: "devforge-api",
    externalId: "12345",
    url: "https://github.com/org/devforge-api",
  });

  const commit = await service.ingestCommit({
    workspaceId: "ws-1",
    repositoryId: repo1.id,
    externalId: "sha-300",
    message: "feat: tenant isolation test",
    authorName: "Dev",
    authorEmail: "dev@example.com",
    committedAt: new Date().toISOString(),
    url: "https://example.com/commit/sha-300",
  });

  const workItemWs2 = await workItemRepository.create({
    workspaceId: "ws-2",
    projectId: "proj-2",
    workflowId: "wf-2",
    workflowStateId: "state-2",
    type: "TASK",
    title: "Tenant 2 Work Item",
    reporterUserId: "user-2",
  });

  // Attempting to link commit in ws-1 to work item in ws-2 must throw GitTenantMismatchError
  await assert.rejects(
    async () => {
      await service.linkCommitToWorkItem(commit.id, workItemWs2.id, "ws-1");
    },
    (err: unknown) => err instanceof GitTenantMismatchError,
  );

  // Attempting to get commit trace from wrong workspace tenant must throw CommitNotFoundError (IDOR protection)
  await assert.rejects(
    async () => {
      await service.getCommitTrace(commit.id, "ws-2");
    },
    (err: unknown) => err instanceof CommitNotFoundError,
  );
});
