import { buildApp } from "./app.js";
import { createAuthenticationModule } from "./modules/auth/auth.module.js";
import { env, getAuthenticationConfiguration } from "./config/env.js";
import { prisma } from "./infrastructure/database/prisma.js";
import { PrismaWorkspaceRepository } from "./modules/workspaces/repositories/prisma/prisma-workspace.repository.js";
import { PrismaProjectRepository } from "./modules/projects/prisma-project.repository.js";
import { PrismaWorkItemRepository } from "./modules/work-management/repositories/prisma/prisma-work-item.repository.js";
import { PrismaWorkflowRepository } from "./modules/work-management/repositories/prisma/prisma-workflow.repository.js";
import { PrismaCommentRepository } from "./modules/work-management/repositories/prisma/prisma-comment.repository.js";
import { PrismaWorkItemHistoryRepository } from "./modules/work-management/repositories/prisma/prisma-work-item-history.repository.js";
import { PrismaRepositoryRepository } from "./modules/git/repositories/prisma/prisma-repository.repository.js";
import { PrismaCommitRepository } from "./modules/git/repositories/prisma/prisma-commit.repository.js";
import { PrismaGitLinkRepository } from "./modules/git/repositories/prisma/prisma-git-link.repository.js";
import { PrismaArchitectureDecisionRepository } from "./modules/architecture/repositories/prisma/prisma-architecture.repository.js";
import { PrismaTechnicalSpecificationRepository } from "./modules/architecture/repositories/prisma/prisma-spec.repository.js";
import { PrismaArchitectureLinkRepository } from "./modules/architecture/repositories/prisma/prisma-architecture-link.repository.js";
import { PrismaPipelineRepository } from "./modules/cicd/repositories/prisma/prisma-pipeline.repository.js";
import { PrismaPipelineRunRepository } from "./modules/cicd/repositories/prisma/prisma-pipeline-run.repository.js";
import { PrismaBuildLogRepository } from "./modules/cicd/repositories/prisma/prisma-build-log.repository.js";
import { PrismaDeploymentRepository } from "./modules/cicd/repositories/prisma/prisma-deployment.repository.js";

const authenticationModule = createAuthenticationModule(
  getAuthenticationConfiguration(),
);

const workspaceRepository = new PrismaWorkspaceRepository();
const projectRepository = new PrismaProjectRepository();
const workItemRepository = new PrismaWorkItemRepository();
const workflowRepository = new PrismaWorkflowRepository();
const commentRepository = new PrismaCommentRepository();
const workItemHistoryRepository = new PrismaWorkItemHistoryRepository();
const repositoryRepository = new PrismaRepositoryRepository(prisma);
const commitRepository = new PrismaCommitRepository(prisma);
const gitLinkRepository = new PrismaGitLinkRepository(prisma);
const adrRepository = new PrismaArchitectureDecisionRepository(prisma);
const specRepository = new PrismaTechnicalSpecificationRepository(prisma);
const architectureLinkRepository = new PrismaArchitectureLinkRepository(prisma);
const pipelineRepository = new PrismaPipelineRepository(prisma);
const pipelineRunRepository = new PrismaPipelineRunRepository(prisma);
const buildLogRepository = new PrismaBuildLogRepository(prisma);
const deploymentRepository = new PrismaDeploymentRepository(prisma);

const app = buildApp({
  authenticationService: authenticationModule.authenticationService,
  accessTokenService: authenticationModule.accessTokenService,
  workspaceRepository,
  projectRepository,
  workItemRepository,
  workflowRepository,
  commentRepository,
  workItemHistoryRepository,
  repositoryRepository,
  commitRepository,
  gitLinkRepository,
  adrRepository,
  specRepository,
  architectureLinkRepository,
  pipelineRepository,
  pipelineRunRepository,
  buildLogRepository,
  deploymentRepository,
});

async function startServer(): Promise<void> {
  try {
    await app.listen({
      port: env.port,
      host: env.host,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down DevForge API");

  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
