-- CreateEnum
CREATE TYPE "GitProvider" AS ENUM ('GITHUB');

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "GitProvider" NOT NULL DEFAULT 'GITHUB',
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commit" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "committedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitWorkItemLink" (
    "commitId" TEXT NOT NULL,
    "workItemId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitWorkItemLink_pkey" PRIMARY KEY ("commitId","workItemId")
);

-- CreateTable
CREATE TABLE "CommitAdrLink" (
    "commitId" TEXT NOT NULL,
    "adrId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommitAdrLink_pkey" PRIMARY KEY ("commitId","adrId")
);

-- CreateIndex
CREATE INDEX "Repository_workspaceId_idx" ON "Repository"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_workspaceId_externalId_key" ON "Repository"("workspaceId", "externalId");

-- CreateIndex
CREATE INDEX "Commit_workspaceId_idx" ON "Commit"("workspaceId");

-- CreateIndex
CREATE INDEX "Commit_repositoryId_idx" ON "Commit"("repositoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Commit_repositoryId_externalId_key" ON "Commit"("repositoryId", "externalId");

-- CreateIndex
CREATE INDEX "CommitWorkItemLink_workspaceId_idx" ON "CommitWorkItemLink"("workspaceId");

-- CreateIndex
CREATE INDEX "CommitWorkItemLink_workItemId_idx" ON "CommitWorkItemLink"("workItemId");

-- CreateIndex
CREATE INDEX "CommitAdrLink_workspaceId_idx" ON "CommitAdrLink"("workspaceId");

-- CreateIndex
CREATE INDEX "CommitAdrLink_adrId_idx" ON "CommitAdrLink"("adrId");

-- AddForeignKey
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitWorkItemLink" ADD CONSTRAINT "CommitWorkItemLink_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitWorkItemLink" ADD CONSTRAINT "CommitWorkItemLink_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitAdrLink" ADD CONSTRAINT "CommitAdrLink_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
