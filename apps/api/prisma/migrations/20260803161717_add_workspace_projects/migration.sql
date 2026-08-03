-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_status_idx" ON "Project"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
