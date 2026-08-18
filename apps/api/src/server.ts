import { buildApp } from "./app.js";
import { createAuthenticationModule } from "./modules/auth/auth.module.js";
import { env, getAuthenticationConfiguration } from "./config/env.js";
import { PrismaWorkspaceRepository } from "./modules/workspaces/repositories/prisma/prisma-workspace.repository.js";
import { PrismaProjectRepository } from "./modules/projects/prisma-project.repository.js";
import { PrismaWorkItemRepository } from "./modules/work-management/repositories/prisma/prisma-work-item.repository.js";
import { PrismaWorkflowRepository } from "./modules/work-management/repositories/prisma/prisma-workflow.repository.js";
import { PrismaCommentRepository } from "./modules/work-management/repositories/prisma/prisma-comment.repository.js";
import { PrismaWorkItemHistoryRepository } from "./modules/work-management/repositories/prisma/prisma-work-item-history.repository.js";

const authenticationModule = createAuthenticationModule(
  getAuthenticationConfiguration(),
);

const workspaceRepository = new PrismaWorkspaceRepository();
const projectRepository = new PrismaProjectRepository();
const workItemRepository = new PrismaWorkItemRepository();
const workflowRepository = new PrismaWorkflowRepository();
const commentRepository = new PrismaCommentRepository();
const workItemHistoryRepository = new PrismaWorkItemHistoryRepository();

const app = buildApp({
  authenticationService: authenticationModule.authenticationService,
  accessTokenService: authenticationModule.accessTokenService,
  workspaceRepository,
  projectRepository,
  workItemRepository,
  workflowRepository,
  commentRepository,
  workItemHistoryRepository,
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
